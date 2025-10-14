import { Index } from "@upstash/vector";

/**
 * Upstash Vector Database Configuration
 * Provides semantic search capabilities for the digital twin RAG system
 */

// Validate environment variables
if (!process.env.UPSTASH_VECTOR_REST_URL) {
  throw new Error("UPSTASH_VECTOR_REST_URL is not defined in environment variables");
}

if (!process.env.UPSTASH_VECTOR_REST_TOKEN) {
  throw new Error("UPSTASH_VECTOR_REST_TOKEN is not defined in environment variables");
}

// Initialize Upstash Vector client with validated credentials
export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

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
