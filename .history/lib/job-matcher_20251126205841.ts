/**
 * Job Matching Engine
 * Analyzes job descriptions and calculates fit scores
 */

import { getVectorIndex } from "./upstash";

export interface SkillMatch {
  skill: string;
  hasSkill: boolean;
  proficiency?: "expert" | "advanced" | "intermediate" | "learning";
  matchStrength: number; // 0-1
}

export interface JobAnalysis {
  matchScore: number; // 0-10
  matchedSkills: SkillMatch[];
  missingSkills: string[];
  strongPoints: string[];
  gapAnalysis: string[];
  recommendation: string;
  confidence: number;
}

/**
 * Extract skills from job description using pattern matching
 */
function extractSkillsFromJobDescription(jobDescription: string): string[] {
  const text = jobDescription.toLowerCase();

  // Common tech skills to look for
  const skillPatterns = [
    // Frontend
    "react",
    "vue",
    "angular",
    "next.js",
    "nextjs",
    "svelte",
    "typescript",
    "javascript",
    "html",
    "css",
    "tailwind",
    "bootstrap",
    "sass",
    "scss",
    "webpack",
    "vite",
    // Backend
    "node.js",
    "nodejs",
    "express",
    "nest.js",
    "nestjs",
    "python",
    "django",
    "flask",
    "fastapi",
    "java",
    "spring",
    "spring boot",
    ".net",
    "c#",
    "go",
    "golang",
    "rust",
    "php",
    "laravel",
    "ruby",
    "rails",
    // Databases
    "mongodb",
    "postgresql",
    "postgres",
    "mysql",
    "redis",
    "dynamodb",
    "firestore",
    "sql",
    "nosql",
    "prisma",
    "mongoose",
    "sequelize",
    // Cloud & DevOps
    "aws",
    "azure",
    "gcp",
    "google cloud",
    "docker",
    "kubernetes",
    "k8s",
    "jenkins",
    "github actions",
    "gitlab ci",
    "terraform",
    "ansible",
    "ci/cd",
    // Tools & Practices
    "git",
    "github",
    "gitlab",
    "bitbucket",
    "jira",
    "agile",
    "scrum",
    "rest api",
    "graphql",
    "microservices",
    "testing",
    "jest",
    "cypress",
    "selenium",
    "junit",
    // Mobile
    "react native",
    "flutter",
    "swift",
    "kotlin",
    "ios",
    "android",
    // Data & AI
    "machine learning",
    "ml",
    "ai",
    "data science",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "scikit-learn",
  ];

  const foundSkills = new Set<string>();

  for (const skill of skillPatterns) {
    // Use word boundaries for better matching
    const regex = new RegExp(`\\b${skill.replace(".", "\\.")}\\b`, "i");
    if (regex.test(text)) {
      foundSkills.add(skill);
    }
  }

  return Array.from(foundSkills);
}

/**
 * Query user's profile for skill information
 */
async function getUserSkills(): Promise<
  Map<string, { level: string; experience: string }>
> {
  const index = getVectorIndex();

  // Search for skill-related information
  const skillsQuery = await index.query({
    data: "technical skills programming languages frameworks expertise levels",
    topK: 20,
    includeMetadata: true,
  });

  const userSkills = new Map<string, { level: string; experience: string }>();

  // Parse the results to extract skills
  for (const result of skillsQuery) {
    const content =
      (result.metadata?.content as string) || (result.data as string) || "";
    const contentLower = content.toLowerCase();

    // Extract skill levels from content
    const skillMappings = [
      { skills: ["react", "next.js", "nextjs"], level: "expert" },
      {
        skills: ["typescript", "javascript", "node.js", "nodejs"],
        level: "expert",
      },
      { skills: ["python", "django", "fastapi"], level: "advanced" },
      { skills: ["aws", "docker", "postgresql", "mongodb"], level: "advanced" },
      { skills: ["tailwind", "css", "html"], level: "expert" },
      { skills: ["git", "github"], level: "expert" },
      { skills: ["c#", ".net", "blazor"], level: "learning" },
      { skills: ["express", "prisma", "graphql"], level: "intermediate" },
    ];

    for (const mapping of skillMappings) {
      for (const skill of mapping.skills) {
        if (contentLower.includes(skill)) {
          userSkills.set(skill, {
            level: mapping.level,
            experience: "Based on profile data",
          });
        }
      }
    }
  }

  return userSkills;
}

/**
 * Calculate proficiency match score
 */
function calculateProficiencyScore(level: string): number {
  const scores: Record<string, number> = {
    expert: 1.0,
    advanced: 0.8,
    intermediate: 0.6,
    learning: 0.3,
  };
  return scores[level] || 0;
}

/**
 * Normalize skill names for better matching
 */
function normalizeSkill(skill: string): string {
  const normalizations: Record<string, string> = {
    nextjs: "next.js",
    nodejs: "node.js",
    nestjs: "nest.js",
    postgres: "postgresql",
    k8s: "kubernetes",
    js: "javascript",
    ts: "typescript",
  };

  const lower = skill.toLowerCase();
  return normalizations[lower] || lower;
}

/**
 * Main job matching function
 */
export async function analyzeJobMatch(
  jobDescription: string
): Promise<JobAnalysis> {
  try {
    // Extract required skills from job description
    const requiredSkills = extractSkillsFromJobDescription(jobDescription);

    // Get user's skills from profile
    const userSkillsMap = await getUserSkills();

    // Analyze matches
    const matchedSkills: SkillMatch[] = [];
    const missingSkills: string[] = [];

    for (const skill of requiredSkills) {
      const normalizedSkill = normalizeSkill(skill);
      const userSkill =
        userSkillsMap.get(normalizedSkill) ||
        userSkillsMap.get(skill.toLowerCase());

      if (userSkill) {
        matchedSkills.push({
          skill: skill,
          hasSkill: true,
          proficiency: userSkill.level as
            | "expert"
            | "advanced"
            | "intermediate"
            | "learning"
            | undefined,
          matchStrength: calculateProficiencyScore(userSkill.level),
        });
      } else {
        // Check for similar skills
        let found = false;
        for (const [userSkillName] of userSkillsMap) {
          if (
            userSkillName.includes(normalizedSkill) ||
            normalizedSkill.includes(userSkillName)
          ) {
            const similarSkill = userSkillsMap.get(userSkillName)!;
            matchedSkills.push({
              skill: skill,
              hasSkill: true,
              proficiency: similarSkill.level as unknown,
              matchStrength:
                calculateProficiencyScore(similarSkill.level) * 0.8, // Partial match
            });
            found = true;
            break;
          }
        }

        if (!found) {
          missingSkills.push(skill);
        }
      }
    }

    // Calculate overall match score
    const totalSkills = requiredSkills.length;
    const matchedCount = matchedSkills.length;
    const weightedScore = matchedSkills.reduce(
      (sum, m) => sum + m.matchStrength,
      0
    );

    let matchScore = 0;
    if (totalSkills > 0) {
      matchScore = (weightedScore / totalSkills) * 10;
    }

    // Identify strong points
    const strongPoints = matchedSkills
      .filter((m) => m.matchStrength >= 0.8)
      .map((m) => `${m.skill} (${m.proficiency})`)
      .slice(0, 5);

    // Gap analysis
    const gapAnalysis: string[] = [];
    if (missingSkills.length > 0) {
      gapAnalysis.push(
        `Missing ${missingSkills.length} required skill(s): ${missingSkills
          .slice(0, 3)
          .join(", ")}`
      );
    }

    const learningSkills = matchedSkills.filter(
      (m) => m.proficiency === "learning"
    );
    if (learningSkills.length > 0) {
      gapAnalysis.push(
        `Currently learning: ${learningSkills.map((s) => s.skill).join(", ")}`
      );
    }

    // Generate recommendation
    let recommendation = "";
    if (matchScore >= 8) {
      recommendation =
        "🎯 Excellent match! You have most of the required skills with strong proficiency. Highly recommended to apply!";
    } else if (matchScore >= 6) {
      recommendation =
        "✅ Good match! You meet many requirements. Consider highlighting your strengths and addressing any skill gaps.";
    } else if (matchScore >= 4) {
      recommendation =
        "⚠️ Moderate match. You have some relevant skills but may need to upskill or emphasize transferable experience.";
    } else {
      recommendation =
        "❌ Limited match. This role requires skills outside your current expertise. Consider if it's worth pursuing or if upskilling is feasible.";
    }

    // Calculate confidence based on how many skills we could analyze
    const confidence = Math.min(
      1,
      (matchedCount + missingSkills.length) / Math.max(totalSkills, 1)
    );

    return {
      matchScore: Math.round(matchScore * 10) / 10, // Round to 1 decimal
      matchedSkills,
      missingSkills,
      strongPoints,
      gapAnalysis,
      recommendation,
      confidence,
    };
  } catch (error) {
    console.error("[Job Matcher] Error:", error);
    throw new Error("Failed to analyze job match");
  }
}
