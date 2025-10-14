import { Groq } from "groq-sdk";

// Initialize Groq client
export const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const DEFAULT_MODEL = "llama-3.1-8b-instant";

export async function generateResponse(
  prompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  try {
    const completion = await groqClient.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content?.trim() || "No response generated";
  } catch (error) {
    console.error("Error generating response with Groq:", error);
    throw new Error("Failed to generate AI response");
  }
}
