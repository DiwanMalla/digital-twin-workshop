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
  // For simple, direct questions, don't over-enhance - keep them focused
  const simpleQuestions = [
    { pattern: /what is (your|my|the) name/i, query: "name identity professional name full name" },
    { pattern: /who are you/i, query: "name identity professional background summary" },
    { pattern: /tell me about yourself/i, query: "professional summary background experience" },
    { pattern: /introduce yourself/i, query: "introduction name title professional summary" },
    { pattern: /(linkedin|email|phone|contact|github|portfolio)/i, query: "contact information email phone linkedin github portfolio" },
    { pattern: /salary|compensation|pay/i, query: "salary compensation expectations current salary" },
  ];
  
  for (const sq of simpleQuestions) {
    if (sq.pattern.test(originalQuery)) {
      console.log(`[LLM] Simple question detected, using focused query`);
      return sq.query;
    }
  }

  const enhancementPrompt = `You are an interview preparation assistant that improves search queries.

Original question: "${originalQuery}"

Enhance this query to better search professional profile data by:
- Adding relevant synonyms and related terms
- Expanding context for interview scenarios
- Including technical and soft skill variations
- Focusing on achievements and quantifiable results

Keep the enhanced query concise (max 100 words) and focused.

Return only the enhanced search query (no explanation):`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: enhancementPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3, // Lower temperature for consistent query enhancement
      max_tokens: 100, // Reduced from 150 to keep queries focused
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
      const content = metadata?.content || "";
      const title = metadata?.title || "";
      
      // Debug: log what we're extracting
      if (content) {
        console.log(`[LLM] Extracting from "${title}": ${content.substring(0, 100)}...`);
      }
      
      return content;
    })
    .filter(Boolean)
    .join("\n\n");

  console.log(`[LLM] Total context length: ${context.length} characters`);
  console.log(`[LLM] Context preview: ${context.substring(0, 200)}...`);

  if (!context) {
    return "I don't have enough information to answer that question effectively.";
  }

  const formattingPrompt = `You are answering a question using the provided professional data. Extract and present the EXACT information requested.

Question: "${originalQuestion}"

Professional Background Data:
${context}

CRITICAL INSTRUCTIONS:
1. If the data contains the requested information (name, email, LinkedIn, phone, salary, etc.), provide it DIRECTLY
2. Do NOT say "I don't have" or "not listed" if the information IS in the data above
3. For contact questions: Extract and provide email, phone, LinkedIn, GitHub, portfolio URLs if present
4. For name questions: Use the exact name from the data (e.g., "Diwan Malla")
5. For salary questions: Provide the exact salary ranges from the data
6. Speak in first person naturally
7. Be concise and direct - just answer what was asked

Answer:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional answering interview questions. You MUST use the exact information provided in the context. NEVER use placeholders like '[Your Name]' or make up information. Extract and use the actual name, skills, and achievements from the data."
        },
        {
          role: "user",
          content: formattingPrompt
        }
      ],
      model: "llama-3.3-70b-versatile", // More powerful model for response crafting
      temperature: 0.3, // Lower temperature for more factual responses
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
    responseModel: "llama-3.3-70b-versatile",
    temperature: 0.3,
    focusAreas: ["technical skills", "problem solving", "architecture", "code quality"],
    responseStyle: "detailed technical examples with metrics",
  },

  behavioral_interview: {
    queryModel: "llama-3.1-8b-instant",
    responseModel: "llama-3.3-70b-versatile",
    temperature: 0.7,
    focusAreas: ["leadership", "teamwork", "communication", "conflict resolution"],
    responseStyle: "STAR format stories with emotional intelligence",
  },

  executive_interview: {
    queryModel: "llama-3.1-8b-instant",
    responseModel: "llama-3.3-70b-versatile",
    temperature: 0.5,
    focusAreas: ["strategic thinking", "business impact", "vision", "leadership"],
    responseStyle: "high-level strategic responses with business metrics",
  },

  hr_screening: {
    queryModel: "llama-3.1-8b-instant",
    responseModel: "llama-3.3-70b-versatile",
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
