"use server";

/**
 * Server Actions for Digital Twin MCP Server
 * Implements RAG (Retrieval-Augmented Generation) functionality
 * Following the pattern from digitaltwin_rag.py
 * Enhanced with LLM-powered query preprocessing and response formatting
 */

import { vectorIndex, type QueryResult } from "./upstash";
import { generateResponse } from "./groq";
import {
  enhanceQuery,
  formatForInterview,
  type RAGMetrics,
} from "./llm-enhanced-rag";
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
  metrics?: RAGMetrics;
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
      console.log(
        `[LoadProfile] Database already contains ${currentCount} vectors`
      );
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
      console.error(
        "[LoadProfile] Failed to read digitaltwin.json:",
        fileError
      );
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

    console.log(
      `[LoadProfile] Processing ${contentChunks.length} content chunks...`
    );

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
    console.log(
      `[LoadProfile] Uploading ${vectors.length} vectors to Upstash...`
    );
    await vectorIndex.upsert(vectors);

    const duration = Date.now() - startTime;
    console.log(
      `[LoadProfile] Successfully uploaded ${vectors.length} vectors in ${duration}ms`
    );

    return {
      success: true,
      message: `Successfully uploaded ${vectors.length} content chunks in ${duration}ms`,
      vectorCount: vectors.length,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LoadProfile] Error after ${duration}ms:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

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
    console.warn(
      `[QueryVectors] topK value ${topK} out of range, clamping to 1-10`
    );
    topK = Math.max(1, Math.min(10, topK));
  }

  try {
    console.log(
      `[QueryVectors] Searching for: "${queryText.substring(
        0,
        50
      )}..." (topK: ${topK})`
    );

    const results = await vectorIndex.query({
      data: queryText,
      topK,
      includeMetadata: true,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[QueryVectors] Found ${results.length} results in ${duration}ms`
    );

    // Log top result for debugging
    if (results.length > 0) {
      console.log(
        `[QueryVectors] Top result: ${
          results[0].metadata?.title
        } (score: ${results[0].score.toFixed(3)})`
      );
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
}
/**
 * Perform RAG query: search vector DB + generate AI response
 * Mirrors the Python implementation's rag_query function
 * @param question - User's question about the digital twin
 * @returns RAG response with answer, sources, and metadata
 */
export async function performRAGQuery(question: string): Promise<RAGResponse> {
  const startTime = Date.now();

  console.log(`[RAG] Starting query: "${question.substring(0, 100)}..."`);

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
        answer:
          "I don't have specific information about that topic. Could you try rephrasing your question or asking about my experience, skills, or projects?",
        sources: [],
        success: true,
        processingTime: Date.now() - startTime,
      };
    }

    // Step 2: Extract relevant content
    console.log(
      `[RAG] Step 2: Extracting content from ${results.length} results...`
    );
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
        answer:
          "I found some information but couldn't extract the details. Please try a different question.",
        sources: [],
        success: true,
        processingTime: Date.now() - startTime,
      };
    }

    console.log(`[RAG] Extracted ${sources.length} sources with content`);

    // Step 3: Generate response with context
    console.log("[RAG] Step 3: Generating AI response...");
    const context = topDocs.join("\n\n");
    const prompt = `You are Diwan Malla. Answer this question in first person using the data below.

RULES:
- "what is your name?" → "My name is Diwan Malla."
- "who are you?" → 2-3 sentences: name, role, expertise
- Simple questions → Simple direct answers
- Detailed questions → Detailed answers with examples/numbers

Your Information:
${context}

Question: ${question}

Answer (as Diwan Malla):`;

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

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      answer:
        "I encountered an error processing your question. Please try again or rephrase your question.",
      sources: [],
      success: false,
      error: errorMessage,
      processingTime,
    };
  }
}

/**
 * Enhanced RAG query with LLM-powered preprocessing and postprocessing
 * Provides interview-focused, context-aware responses
 * @param question - User's question about the digital twin
 * @returns Enhanced RAG response optimized for interview preparation
 */
export async function performEnhancedRAGQuery(
  question: string
): Promise<RAGResponse> {
  const startTime = Date.now();
  const metrics: Partial<RAGMetrics> = {};

  console.log(
    `[Enhanced RAG] Starting query: "${question.substring(0, 100)}..."`
  );

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

    // Step 1: Enhance query with LLM
    console.log("[Enhanced RAG] Step 1: Enhancing query with LLM...");
    const enhanceStart = Date.now();
    const enhancedQuery = await enhanceQuery(question);
    metrics.queryEnhancementTime = Date.now() - enhanceStart;
    metrics.enhancedQuery = enhancedQuery;

    // Step 2: Query vector database with enhanced query
    console.log(
      "[Enhanced RAG] Step 2: Querying vector database with enhanced query..."
    );
    const searchStart = Date.now();
    const results = await queryVectors(enhancedQuery, 5); // Get more results for better context
    metrics.vectorSearchTime = Date.now() - searchStart;
    metrics.resultsFound = results.length;

    if (!results || results.length === 0) {
      console.log("[Enhanced RAG] No results found in vector database");
      return {
        answer:
          "I don't have specific information about that topic. Could you try rephrasing your question or asking about my experience, skills, or projects?",
        sources: [],
        success: true,
        processingTime: Date.now() - startTime,
        metrics: metrics as RAGMetrics,
      };
    }

    // Step 3: Extract relevant content
    console.log(
      `[Enhanced RAG] Step 3: Extracting content from ${results.length} results...`
    );
    const sources = results
      .filter((result) => result.metadata?.content)
      .map((result) => {
        const title = (result.metadata?.title as string) || "Information";
        const content = (result.metadata?.content as string) || "";

        return {
          title,
          content,
          score: result.score,
        };
      });

    if (sources.length === 0) {
      console.warn(
        "[Enhanced RAG] Results found but no content could be extracted"
      );
      return {
        answer:
          "I found some information but couldn't extract the details. Please try a different question.",
        sources: [],
        success: true,
        processingTime: Date.now() - startTime,
        metrics: metrics as RAGMetrics,
      };
    }

    console.log(
      `[Enhanced RAG] Extracted ${sources.length} sources with content`
    );

    // Step 4: Format response for interview context with LLM
    console.log(
      "[Enhanced RAG] Step 4: Formatting response for interview context..."
    );
    const formatStart = Date.now();
    const answer = await formatForInterview(results, question);
    metrics.responseFormattingTime = Date.now() - formatStart;

    metrics.totalTime = Date.now() - startTime;
    console.log(
      `[Enhanced RAG] Query completed successfully in ${metrics.totalTime}ms`
    );
    console.log(`[Enhanced RAG] Performance breakdown:`, metrics);

    return {
      answer,
      sources,
      success: true,
      processingTime: metrics.totalTime,
      metrics: metrics as RAGMetrics,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Enhanced RAG] Error after ${processingTime}ms:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Fallback to basic RAG on error
    console.log("[Enhanced RAG] Falling back to basic RAG...");
    return await performRAGQuery(question);
  }
}

/**
 * Simple query function for the dashboard UI
 * @param question - User's question
 * @returns Answer and sources
 */
export async function queryDigitalTwin(question: string): Promise<{
  answer: string;
  sources: Array<{ title: string; score: number }>;
}> {
  const result = await performEnhancedRAGQuery(question);

  return {
    answer: result.answer,
    sources: result.sources.map((s) => ({ title: s.title, score: s.score })),
  };
}

/**
 * Compare basic RAG vs enhanced RAG side-by-side
 * Useful for evaluating improvements and A/B testing
 * @param question - User's question about the digital twin
 * @returns Comparison of both approaches with metrics
 */
export async function compareRAGApproaches(question: string): Promise<{
  question: string;
  results: {
    basic: RAGResponse;
    enhanced: RAGResponse;
  };
  totalComparisonTime: number;
}> {
  const startTime = Date.now();

  console.log(`[Comparison] Testing both RAG approaches for: "${question}"`);

  // Run both approaches in parallel
  const [basicResult, enhancedResult] = await Promise.all([
    performRAGQuery(question),
    performEnhancedRAGQuery(question),
  ]);

  const totalTime = Date.now() - startTime;

  console.log(`[Comparison] Both approaches completed in ${totalTime}ms`);
  console.log(
    `[Comparison] Basic: ${basicResult.processingTime}ms, Enhanced: ${enhancedResult.processingTime}ms`
  );

  return {
    question,
    results: {
      basic: basicResult,
      enhanced: enhancedResult,
    },
    totalComparisonTime: totalTime,
  };
}
