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

        // Step 1: Vector search - search for relevant content
        const results = await index.query({
          data: question,
          topK: 5,
          includeMetadata: true,
        });

        // Log search results for debugging
        console.log("[Stream] Vector search results:", results.length);
        results.forEach((r, i) => {
          console.log(`[Stream] Match ${i + 1}: score=${r.score}, metadata=`, r.metadata);
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Generating response..." })}\n\n`)
        );

        // Step 2: Build context from search results
        const contextParts = results.map((r, i) => {
          const title = r.metadata?.title || `Result ${i + 1}`;
          const content = r.metadata?.content || r.metadata?.text || "";
          return `[${title}]\n${content}`;
        }).filter(part => part.length > 5); // Filter out empty results

        const context = contextParts.join("\n\n---\n\n");

        console.log("[Stream] Context length:", context.length);
        console.log("[Stream] Number of context parts:", contextParts.length);
        console.log("[Stream] Context preview:", context.substring(0, 300));

        // Ensure we have context
        if (!context || context.trim().length === 0) {
          throw new Error("No relevant information found in database");
        }

        const prompt = `Based on the following information from Diwan Malla's profile, answer the question below.

PROFILE DATA:
${context}

QUESTION: ${question}

INSTRUCTIONS:
- Answer as if you ARE Diwan Malla (use "I", "my", not "he", "his")
- For "what is your name?" just say: "My name is Diwan Malla."
- For "who are you?" give 2-3 sentences with name, role, and expertise
- Use ONLY the information provided above
- Be direct and concise for simple questions
- If asked about something not in the data, say "I don't have that information in my profile"

ANSWER:`;

        // Step 3: Stream response
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are answering as Diwan Malla. Use the provided profile data to answer accurately. Never fabricate information. Speak in first person naturally.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 700,
          stream: true,
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
