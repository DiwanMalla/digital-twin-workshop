import { Index } from "@upstash/vector";

/**
 * Upstash Vector Database Configuration
 * Provides semantic search capabilities for the digital twin RAG system
 */

// Create a proxy that always uses fresh credentials
export const vectorIndex = new Proxy({} as Index, {
  get(_target, prop) {
    // Get fresh env vars each time
    const url = process.env.UPSTASH_VECTOR_REST_URL;
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

    // Debug logging (remove in production)
    if (!url || !token) {
      console.error("[Upstash] Missing credentials!", {
        hasUrl: !!url,
        hasToken: !!token,
        urlPreview: url?.substring(0, 30),
        tokenPreview: token?.substring(0, 20),
      });
    }

    // Create fresh index instance for each property access
    const index = new Index({
      url: url!,
      token: token!,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (index as any)[prop];

    // If it's a function, bind it to the index
    if (typeof value === "function") {
      return value.bind(index);
    }

    return value;
  },
});

// Also export a function that creates a fresh instance
export function getVectorIndex() {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash credentials not found in environment variables");
  }

  return new Index({
    url,
    token,
  });
}

/**
 * Content chunk structure matching digitaltwin.json format
 */
export interface ContentChunk {
  id: string;
  title: string;
  type: string;
  content: string;
  metadata?: {
    category?: string;
    tags?: string[];
  };
}

/**
 * Query result from vector database with relevance score
 */
export interface QueryResult {
  id: string;
  score: number;
  metadata?: {
    title?: string;
    content?: string;
    type?: string;
    category?: string;
    tags?: string[];
  };
}
