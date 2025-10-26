/**
 * GitHub Auto-Sync Module
 * Fetches repository data, README files, and commit history from GitHub
 * Transforms and stores them in Upstash Vector Database
 */

import { Index } from "@upstash/vector";

// Get Upstash Vector client instance
function getVectorClient() {
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  });
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
}

export interface SyncResult {
  success: boolean;
  repos_synced: number;
  commits_synced: number;
  errors: string[];
  last_sync: string;
}

/**
 * Fetch all public repositories for a GitHub user
 */
export async function fetchGitHubRepos(
  username: string
): Promise<GitHubRepo[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const repos: GitHubRepo[] = await response.json();
    return repos.filter((repo) => !repo.fork); // Exclude forked repos
  } catch (error) {
    console.error("[GitHub Sync] Error fetching repos:", error);
    throw error;
  }
}

/**
 * Fetch README content for a repository
 */
export async function fetchRepoReadme(
  owner: string,
  repo: string
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.raw+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers }
    );

    if (response.status === 404) {
      return null; // No README file
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.text();
  } catch (error) {
    console.error(`[GitHub Sync] Error fetching README for ${repo}:`, error);
    return null;
  }
}

/**
 * Fetch recent commits for a repository
 */
export async function fetchRepoCommits(
  owner: string,
  repo: string,
  limit: number = 10
): Promise<GitHubCommit[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`,
      { headers }
    );

    // Handle 409 Conflict (empty repository) gracefully
    if (response.status === 409) {
      console.log(`[GitHub Sync] Repository ${repo} is empty, skipping commits`);
      return [];
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`[GitHub Sync] Error fetching commits for ${repo}:`, error);
    return [];
  }
}

/**
 * Transform GitHub repository data into vector-ready chunks
 */
export function transformRepoToChunks(
  repo: GitHubRepo,
  readme: string | null,
  commits: GitHubCommit[]
) {
  const chunks = [];

  // Main repo chunk
  const technologies = [repo.language, ...repo.topics]
    .filter(Boolean)
    .join(", ");

  const repoContent = `
Repository: ${repo.name}
Description: ${repo.description || "No description"}
Technologies: ${technologies}
Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count}
Created: ${new Date(repo.created_at).toLocaleDateString()}
Last Updated: ${new Date(repo.updated_at).toLocaleDateString()}
URL: ${repo.html_url}
${repo.homepage ? `Homepage: ${repo.homepage}` : ""}
  `.trim();

  chunks.push({
    id: `github-repo-${repo.id}`,
    data: repoContent,
    metadata: {
      type: "github_repository",
      title: repo.name,
      content: repoContent,
      url: repo.html_url,
      language: repo.language || "Unknown",
      topics: repo.topics.join(", "),
      stars: repo.stargazers_count,
      category: "Projects",
      source: "github_auto_sync",
      synced_at: new Date().toISOString(),
    },
  });

  // README chunk (if available)
  if (readme && readme.length > 100) {
    // Only include substantial READMEs
    const readmeChunk = `
${repo.name} - README

${readme.substring(0, 2000)} // Limit to 2000 chars to avoid token limits

Technologies: ${technologies}
Repository: ${repo.html_url}
    `.trim();

    chunks.push({
      id: `github-readme-${repo.id}`,
      data: readmeChunk,
      metadata: {
        type: "github_readme",
        title: `${repo.name} - Documentation`,
        content: readmeChunk,
        url: repo.html_url,
        language: repo.language || "Unknown",
        category: "Projects",
        source: "github_auto_sync",
        synced_at: new Date().toISOString(),
      },
    });
  }

  // Recent commits summary
  if (commits.length > 0) {
    const recentActivity = commits
      .slice(0, 5)
      .map(
        (c) =>
          `- ${c.commit.message.split("\n")[0]} (${new Date(
            c.commit.author.date
          ).toLocaleDateString()})`
      )
      .join("\n");

    const commitsContent = `
${repo.name} - Recent Activity

Recent commits:
${recentActivity}

Technologies: ${technologies}
Repository: ${repo.html_url}
    `.trim();

    chunks.push({
      id: `github-commits-${repo.id}`,
      data: commitsContent,
      metadata: {
        type: "github_activity",
        title: `${repo.name} - Recent Activity`,
        content: commitsContent,
        url: repo.html_url,
        category: "Projects",
        source: "github_auto_sync",
        synced_at: new Date().toISOString(),
      },
    });
  }

  return chunks;
}

/**
 * Sync all GitHub data to Upstash Vector Database
 */
export async function syncGitHubToVector(
  username: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    repos_synced: 0,
    commits_synced: 0,
    errors: [],
    last_sync: new Date().toISOString(),
  };

  try {
    console.log(`[GitHub Sync] Starting sync for user: ${username}`);

    // Fetch all repos
    const repos = await fetchGitHubRepos(username);
    console.log(`[GitHub Sync] Found ${repos.length} repositories`);

    // Process each repo
    const allChunks = [];
    for (const repo of repos) {
      try {
        console.log(`[GitHub Sync] Processing: ${repo.name}`);

        // Fetch README and commits in parallel
        const [readme, commits] = await Promise.all([
          fetchRepoReadme(username, repo.name),
          fetchRepoCommits(username, repo.name, 10),
        ]);

        // Transform to chunks
        const chunks = transformRepoToChunks(repo, readme, commits);
        allChunks.push(...chunks);

        result.repos_synced++;
        result.commits_synced += commits.length;
      } catch (error) {
        const errorMsg = `Failed to process ${repo.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(`[GitHub Sync] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Upsert all chunks to vector database
    if (allChunks.length > 0) {
      console.log(
        `[GitHub Sync] Upserting ${allChunks.length} chunks to vector DB`
      );

      const index = getVectorClient();

      // Upsert in smaller batches (reduce from 100 to 10 for reliability)
      const batchSize = 10;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        try {
          // Add delay between batches to avoid rate limiting
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          
          await index.upsert(batch);
          console.log(
            `[GitHub Sync] Upserted batch ${
              Math.floor(i / batchSize) + 1
            }/${Math.ceil(allChunks.length / batchSize)}`
          );
        } catch (error) {
          console.error(`[GitHub Sync] Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error);
          // Continue with other batches even if one fails
          result.errors.push(
            `Failed to upsert batch ${Math.floor(i / batchSize) + 1}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    }

    result.success = true;
    console.log(
      `[GitHub Sync] Sync completed: ${result.repos_synced} repos, ${result.commits_synced} commits`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[GitHub Sync] Sync failed: ${errorMsg}`);
    result.errors.push(errorMsg);
    result.success = false;
  }

  return result;
}

/**
 * Get the last sync timestamp from metadata
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    const index = getVectorClient();
    
    // Query for any github-synced item to check last sync time
    const results = await index.query({
      data: "github repository",
      topK: 1,
      includeMetadata: true,
      filter: "source = 'github_auto_sync'",
    });

    if (results.length > 0 && results[0].metadata?.synced_at) {
      return results[0].metadata.synced_at as string;
    }
  } catch (error) {
    console.error("[GitHub Sync] Error getting last sync time:", error);
  }

  return null;
}
