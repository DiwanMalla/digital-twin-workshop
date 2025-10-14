import Groq from "groq-sdk";

/**
 * Groq AI Configuration
 * Provides ultra-fast LLM inference for generating personalized responses
 */

export const DEFAULT_MODEL = "llama-3.1-8b-instant";

/**
 * System prompt for digital twin persona
 */
const SYSTEM_PROMPT = `You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience. Be professional, concise, and authentic.`;

/**
 * Generate AI response using Groq LLM
 * @param prompt - The context and question to answer
 * @param model - The Groq model to use (default: llama-3.1-8b-instant)
 * @returns Generated response text
 * @throws Error if API key is missing or generation fails
 */
export async function generateResponse(
  prompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const startTime = Date.now();
  
  // Validate API key
  if (!process.env.GROQ_API_KEY) {
    console.error("[Groq] GROQ_API_KEY is not defined");
    throw new Error("GROQ_API_KEY is not configured");
  }

  // Validate input
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  try {
    console.log(`[Groq] Starting generation with model: ${model}`);
    
    const groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groqClient.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      console.warn("[Groq] Empty response received from API");
      return "I apologize, but I couldn't generate a response. Please try rephrasing your question.";
    }

    const duration = Date.now() - startTime;
    console.log(`[Groq] Generation completed in ${duration}ms`);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Groq] Error after ${duration}ms:`, error);
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("rate limit")) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (error.message.includes("authentication")) {
        throw new Error("Authentication failed. Please check API key.");
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
    
    throw new Error("Failed to generate AI response");
  }
}
