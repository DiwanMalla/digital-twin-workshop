"use server";

/**
 * Server Actions for Digital Twin MCP Server
 * Implements RAG (Retrieval-Augmented Generation) functionality
 * Following the pattern from digitaltwin_rag.py
 */

import { vectorIndex, type QueryResult } from "./upstash";
import { generateResponse } from "./groq";
import fs from "fs/promises";
import path from "path";

/**
 * Response structure for RAG queries
 */
interface RAGResponse {
  answer: string;
  sources: Array<{
    title: string;
    content: string;
    score: number;
  }>;
  success: boolean;
  error?: string;
  processingTime?: number;
}

/**
 * Load and index the digital twin profile data from digitaltwin.json
 * Mirrors the Python implementation's setup_vector_database function
 * @returns Status of the database loading operation
 */
export async function loadProfileData(): Promise<{
  success: boolean;
  message: string;
  vectorCount?: number;
}> {
  const startTime = Date.now();
  
  try {
    console.log("[LoadProfile] Checking vector database status...");
    
    // Check current vector count
    const info = await vectorIndex.info();
    const currentCount = info.vectorCount || 0;

    if (currentCount > 0) {
      console.log(`[LoadProfile] Database already contains ${currentCount} vectors`);
      return {
        success: true,
        message: `Database already loaded with ${currentCount} vectors`,
        vectorCount: currentCount,
      };
    }

    console.log("[LoadProfile] Loading digitaltwin.json...");
    
    // Load digitaltwin.json
    const jsonPath = path.join(process.cwd(), "digitaltwin.json");
    
    let fileContent: string;
    try {
      fileContent = await fs.readFile(jsonPath, "utf-8");
    } catch (fileError) {
      console.error("[LoadProfile] Failed to read digitaltwin.json:", fileError);
      return {
        success: false,
        message: "digitaltwin.json file not found or cannot be read",
      };
    }

    let profileData: { content_chunks?: unknown[] };
    try {
      profileData = JSON.parse(fileContent);
    } catch (parseError) {
      console.error("[LoadProfile] Failed to parse JSON:", parseError);
      return {
        success: false,
        message: "Invalid JSON format in digitaltwin.json",
      };
    }

    const contentChunks = profileData.content_chunks;

    if (!contentChunks || contentChunks.length === 0) {
      console.error("[LoadProfile] No content chunks found in profile data");
      return {
        success: false,
        message: "No content chunks found in profile data",
      };
    }

    console.log(`[LoadProfile] Processing ${contentChunks.length} content chunks...`);

    // Prepare vectors in the format Upstash expects
    type ChunkType = {
      id: string;
      title: string;
      type: string;
      content: string;
      metadata?: { category?: string; tags?: string[] };
    };
    
    const vectors = (contentChunks as ChunkType[]).map((chunk) => {
      const enrichedText = `${chunk.title}: ${chunk.content}`;

      return {
        id: chunk.id,
        data: enrichedText,
        metadata: {
          title: chunk.title,
          type: chunk.type,
          content: chunk.content,
          category: chunk.metadata?.category || "",
          tags: chunk.metadata?.tags || [],
        },
      };
    });

    // Upload vectors to Upstash
    console.log(`[LoadProfile] Uploading ${vectors.length} vectors to Upstash...`);
    await vectorIndex.upsert(vectors);

    const duration = Date.now() - startTime;
    console.log(`[LoadProfile] Successfully uploaded ${vectors.length} vectors in ${duration}ms`);

    return {
      success: true,
      message: `Successfully uploaded ${vectors.length} content chunks in ${duration}ms`,
      vectorCount: vectors.length,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LoadProfile] Error after ${duration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      success: false,
      message: `Error loading profile data: ${errorMessage}`,
    };
  }
}

/**
 * Query the vector database for relevant information
 * Mirrors the Python implementation's query_vectors function
 * @param queryText - The search query
 * @param topK - Number of results to return (default: 3)
 * @returns Array of relevant results with scores
 * @throws Error if query fails
 */
export async function queryVectors(
  queryText: string,
  topK: number = 3
): Promise<QueryResult[]> {
  const startTime = Date.now();
  
  // Validate input
  if (!queryText || queryText.trim().length === 0) {
    throw new Error("Query text cannot be empty");
  }
  
  if (topK < 1 || topK > 10) {
    console.warn(`[QueryVectors] topK value ${topK} out of range, clamping to 1-10`);
    topK = Math.max(1, Math.min(10, topK));
  }
  
  try {
    console.log(`[QueryVectors] Searching for: "${queryText.substring(0, 50)}..." (topK: ${topK})`);
    
    const results = await vectorIndex.query({
      data: queryText,
      topK,
      includeMetadata: true,
    });

    const duration = Date.now() - startTime;
    console.log(`[QueryVectors] Found ${results.length} results in ${duration}ms`);
    
    // Log top result for debugging
    if (results.length > 0) {
      console.log(`[QueryVectors] Top result: ${results[0].metadata?.title} (score: ${results[0].score.toFixed(3)})`);
    }

    return results.map((result) => ({
      id: String(result.id),
      score: result.score,
      metadata: result.metadata as Record<string, unknown> | undefined,
    }));
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[QueryVectors] Error after ${duration}ms:`, error);
    
    if (error instanceof Error) {
      throw new Error(`Vector query failed: ${error.message}`);
    }
    throw new Error("Failed to query vector database");
  }
}/**
 * Perform RAG query: search vector DB + generate AI response
 * Mirrors the Python implementation's rag_query function
 * @param question - User's question about the digital twin
 * @returns RAG response with answer, sources, and metadata
 */
export async function performRAGQuery(question: string): Promise<RAGResponse> {
  const startTime = Date.now();
  
  console.log(`[RAG] Starting query: "${question.substring(0, 100)}..."`)
  
  try {
    // Validate input
    if (!question || question.trim().length === 0) {
      return {
        answer: "Please provide a question.",
        sources: [],
        success: false,
        error: "Empty question",
        processingTime: Date.now() - startTime,
      };
    }

    // Step 1: Query vector database
    console.log("[RAG] Step 1: Querying vector database...");
    const results = await queryVectors(question, 3);

    if (!results || results.length === 0) {
      console.log("[RAG] No results found in vector database");
      return {
        answer: "I don't have specific information about that topic. Could you try rephrasing your question or asking about my experience, skills, or projects?",
        sources: [],
        success: true,
        processingTime: Date.now() - startTime,
      };
    }

    // Step 2: Extract relevant content
    console.log(`[RAG] Step 2: Extracting content from ${results.length} results...`);
    const topDocs: string[] = [];
    const sources = results
      .filter((result) => result.metadata?.content)
      .map((result) => {
        const title = (result.metadata?.title as string) || "Information";
        const content = (result.metadata?.content as string) || "";

        topDocs.push(`${title}: ${content}`);

        return {
          title,
          content,
          score: result.score,
        };
      });

    if (topDocs.length === 0) {
      console.warn("[RAG] Results found but no content could be extracted");
      return {
        answer: "I found some information but couldn't extract the details. Please try a different question.",
        sources: [],
        success: true,
        processingTime: Date.now() - startTime,
      };
    }

    console.log(`[RAG] Extracted ${sources.length} sources with content`);

    // Step 3: Generate response with context
    console.log("[RAG] Step 3: Generating AI response...");
    const context = topDocs.join("\n\n");
    const prompt = `Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
${context}

Question: ${question}

Provide a helpful, professional response:`;

    const answer = await generateResponse(prompt);
    
    const processingTime = Date.now() - startTime;
    console.log(`[RAG] Query completed successfully in ${processingTime}ms`);

    return {
      answer,
      sources,
      success: true,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[RAG] Error after ${processingTime}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      answer: "I encountered an error processing your question. Please try again or rephrase your question.",
      sources: [],
      success: false,
      error: errorMessage,
      processingTime,
    };
  }
}
