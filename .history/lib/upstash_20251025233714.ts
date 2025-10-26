import { Index } from "@upstash/vector";

/**
 * Upstash Vector Database Configuration
 * Provides semantic search capabilities for the digital twin RAG system
 */

// Create a proxy that always uses fresh credentials
export const vectorIndex = new Proxy({} as Index, {
  get(_target, prop) {
    // Create fresh index instance for each property access
    const index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
    
    const value = (index as any)[prop];
    
    // If it's a function, bind it to the index
    if (typeof value === 'function') {
      return value.bind(index);
    }
    
    return value;
  }
});

// Also export a function that creates a fresh instance
export function getVectorIndex() {
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
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
