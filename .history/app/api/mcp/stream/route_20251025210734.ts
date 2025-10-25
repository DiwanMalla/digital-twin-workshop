import { Index } from "@upstash/vector";
import Groq from "groq-sdk";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const { question } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send status update
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Searching vector database..." })}\n\n`)
        );

        // Step 1: Vector search
        const results = await index.query({
          data: question,
          topK: 5,
          includeMetadata: true,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Generating response..." })}\n\n`)
        );

        // Step 2: Build context
        const context = results
          .map((r) => r.metadata?.text || "")
          .filter(Boolean)
          .join("\n\n");

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

        // Step 3: Stream response
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are Diwan Malla. For simple questions, give simple answers. For 'what is your name?', just say 'My name is Diwan Malla.' Don't over-explain unless asked for details.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 700,
          stream: true, // Enable streaming!
        });

        // Stream tokens as they arrive
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`)
            );
          }
        }

        // Send done signal
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
