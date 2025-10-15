/**
 * LLM-Enhanced RAG System
 * Implements query preprocessing and response post-processing for intelligent interview preparation
 */

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/**
 * Enhance user query with LLM to improve vector search accuracy
 * Transforms generic questions into interview-focused search queries
 * 
 * Example:
 * "Tell me about my projects" → 
 * "software development projects technical achievements leadership roles 
 *  problem-solving examples measurable outcomes project management"
 */
export async function enhanceQuery(originalQuery: string): Promise<string> {
  const enhancementPrompt = `You are an interview preparation assistant that improves search queries.

Original question: "${originalQuery}"

Enhance this query to better search professional profile data by:
- Adding relevant synonyms and related terms
- Expanding context for interview scenarios
- Including technical and soft skill variations
- Focusing on achievements and quantifiable results

Return only the enhanced search query (no explanation):`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: enhancementPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3, // Lower temperature for consistent query enhancement
      max_tokens: 150,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim() || originalQuery;
    console.log(`[LLM] Query enhanced: "${originalQuery}" → "${enhanced}"`);
    return enhanced;
  } catch (error) {
    console.error("[LLM] Query enhancement failed:", error);
    return originalQuery; // Fallback to original query
  }
}

/**
 * Format RAG results for interview-ready responses
 * Transforms technical details into compelling interview stories
 * Applies STAR format when appropriate
 */
export async function formatForInterview(
  ragResults: Array<{ metadata?: Record<string, unknown>; score: number }>,
  originalQuestion: string
): Promise<string> {
  const context = ragResults
    .map((result) => {
      const metadata = result.metadata as { content?: string; title?: string } | undefined;
      return metadata?.content || metadata?.title || "";
    })
    .filter(Boolean)
    .join("\n\n");

  if (!context) {
    return "I don't have enough information to answer that question effectively.";
  }

  const formattingPrompt = `You are an expert interview coach. Create a compelling interview response using this professional data.

Question: "${originalQuestion}"

Professional Background Data:
${context}

Create a response that:
- Directly addresses the interview question
- Uses specific examples and quantifiable achievements
- Applies STAR format (Situation-Task-Action-Result) when telling stories
- Sounds confident and natural for an interview setting
- Highlights unique value and differentiators
- Includes relevant technical details without being overwhelming
- Speaks in first person

Interview Response:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: formattingPrompt }],
      model: "llama-3.1-70b-versatile", // More powerful model for response crafting
      temperature: 0.7, // Higher creativity for natural responses
      max_tokens: 600,
    });

    const response = completion.choices[0]?.message?.content?.trim() || context;
    console.log(`[LLM] Response formatted for interview context`);
    return response;
  } catch (error) {
    console.error("[LLM] Response formatting failed:", error);
    return context; // Fallback to raw RAG results
  }
}

/**
 * Configuration for different interview types
 */
export const RAG_CONFIGS = {
  technical_interview: {
    queryModel: "llama-3.1-8b-instant",
    responseModel: "llama-3.1-70b-versatile",
    temperature: 0.3,
    focusAreas: ["technical skills", "problem solving", "architecture", "code quality"],
    responseStyle: "detailed technical examples with metrics",
  },

  behavioral_interview: {
    queryModel: "llama-3.1-8b-instant",
    responseModel: "llama-3.1-70b-versatile",
    temperature: 0.7,
    focusAreas: ["leadership", "teamwork", "communication", "conflict resolution"],
    responseStyle: "STAR format stories with emotional intelligence",
  },

  executive_interview: {
    queryModel: "llama-3.1-70b-versatile",
    responseModel: "llama-3.1-70b-versatile",
    temperature: 0.5,
    focusAreas: ["strategic thinking", "business impact", "vision", "leadership"],
    responseStyle: "high-level strategic responses with business metrics",
  },

  hr_screening: {
    queryModel: "llama-3.1-8b-instant",
    responseModel: "llama-3.1-70b-versatile",
    temperature: 0.6,
    focusAreas: ["culture fit", "motivation", "career goals", "work style"],
    responseStyle: "clear, personable responses showing alignment",
  },
} as const;

export type InterviewType = keyof typeof RAG_CONFIGS;

/**
 * Context-aware RAG that adapts to different interview scenarios
 */
export async function enhanceQueryForInterviewType(
  question: string,
  interviewType: InterviewType
): Promise<string> {
  const config = RAG_CONFIGS[interviewType];

  const contextualPrompt = `You are preparing for a ${interviewType.replace("_", " ")}.

Question: "${question}"

Enhance this query to search for information relevant to:
${config.focusAreas.map((area) => `- ${area}`).join("\n")}

Response should focus on: ${config.responseStyle}

Return only the enhanced search query:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: contextualPrompt }],
      model: config.queryModel,
      temperature: config.temperature,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content?.trim() || question;
  } catch (error) {
    console.error(`[LLM] Context-aware enhancement failed for ${interviewType}:`, error);
    return question;
  }
}

/**
 * Performance monitoring interface
 */
export interface RAGMetrics {
  queryEnhancementTime: number;
  vectorSearchTime: number;
  responseFormattingTime: number;
  totalTime: number;
  enhancedQuery: string;
  resultsFound: number;
}
