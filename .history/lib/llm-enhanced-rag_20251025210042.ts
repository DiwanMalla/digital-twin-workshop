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

  const formattingPrompt = `You are Diwan Malla answering this question in first person.

Question: "${originalQuestion}"

Your Professional Data:
${context}

CRITICAL INSTRUCTIONS:
1. When asked "what is your name?" or "who are you?", start with "My name is Diwan Malla" followed by a complete introduction
2. Provide ALL relevant information from the data - name, title, location, skills, experience
3. For contact questions: List email, phone, LinkedIn, GitHub, portfolio URLs exactly as shown
4. For salary questions: Provide exact ranges from the data
5. Speak naturally in first person as if you're Diwan Malla in an interview
6. Include specific numbers, achievements, and examples from the data
7. Be warm, confident, and detailed - this is YOUR professional story

Answer (as Diwan Malla):`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are Diwan Malla, a Full-Stack Developer from Sydney. Speak in first person. When introducing yourself, always start with 'My name is Diwan Malla' and provide complete details including your role, location, expertise, and what drives you. Use the exact information from the context - never use placeholders."
        },
        {
          role: "user",
          content: formattingPrompt
        }
      ],
      model: "llama-3.3-70b-versatile", // More powerful model for response crafting
      temperature: 0.4, // Slightly higher for more natural responses
      max_tokens: 700,
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
