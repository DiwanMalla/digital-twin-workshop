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
        // Enhance query for better matching
        let enhancedQuery = question;
        const lowerQuestion = question.toLowerCase();
        
        if (lowerQuestion.includes('project')) {
          enhancedQuery = `${question} portfolio projects built developed`;
        } else if (lowerQuestion.includes('skill') || lowerQuestion.includes('technolog') || lowerQuestion.includes('expertise')) {
          enhancedQuery = `${question} technical skills expertise programming languages frameworks frontend backend React Next.js Node.js TypeScript Python`;
        }
        
        const results = await index.query({
          data: enhancedQuery,
          topK: 15, // Increased to get more results
          includeMetadata: true,
        });

        // Log search results for debugging
        console.log("[Stream] Vector search results:", results.length);
        results.forEach((r, i) => {
          console.log(`[Stream] Match ${i + 1}: score=${r.score?.toFixed(3)}, title="${r.metadata?.title}"`);
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Generating response..." })}\n\n`)
        );

        // Step 2: Build context from search results
        const contextParts = results
          .filter(r => (r.score || 0) > 0.5) // Only use results with good scores
          .map((r, i) => {
            const title = r.metadata?.title || `Result ${i + 1}`;
            const content = r.metadata?.content || r.metadata?.text || "";
            const type = r.metadata?.type || r.metadata?.category || "";
            
            // Format with type for better context
            return `[${type ? `${type} - ` : ''}${title}]\n${content}`;
          })
          .filter(part => part.length > 10); // Filter out empty/short results

        const context = contextParts.join("\n\n---\n\n");

        console.log("[Stream] Context length:", context.length);
        console.log("[Stream] Number of context parts:", contextParts.length);
        console.log("[Stream] Context titles:", results.slice(0, 5).map(r => r.metadata?.title));

        // Ensure we have context
        if (!context || context.trim().length === 0) {
          throw new Error("No relevant information found in database. Please try rephrasing your question.");
        }

        const prompt = `You are Diwan Malla. Answer this question using ONLY the information provided below from your profile.

YOUR PROFILE INFORMATION:
${context}

QUESTION: ${question}

CRITICAL RULES:
1. Answer in first person as "I" (you ARE Diwan Malla)
2. For "what is your name?" → Simply say "My name is Diwan Malla."
3. For "who are you?" → 2-3 sentences: name, role (Full-Stack Developer), location (Sydney), expertise
4. For PROJECT questions (e.g., "what projects", "your projects", "projects you built", "portfolio"):
   - Look for entries with type="project" or category="project" in the data above
   - List ALL projects found: Job Tracker, PDFly, SangeetX, BrainiX
   - Include: name, duration, description, technologies, impact/results
   - Do NOT mention work experience from companies unless specifically asked about work history
5. For SKILLS/TECHNOLOGY questions (e.g., "what are your skills", "technical skills", "technologies", "expertise"):
   - Look for entries with type="skills" or category="skills" in the data above
   - Include comprehensive list organized by category:
     * Frontend: React 19, Next.js 15, TypeScript, JavaScript ES6+, Material UI, Tailwind CSS, etc.
     * Backend: Node.js, Express, Python (Flask), REST APIs
     * Databases: PostgreSQL, MongoDB, MySQL, Redis
     * Cloud/DevOps: AWS (S3, EC2, Lambda), GitHub Actions, CI/CD, Docker
     * UI/UX: Figma, Adobe XD, Responsive Design, Accessibility
     * Testing: Jest, React Testing Library, Cypress
   - Mention expertise levels (Expert, Advanced, Intermediate, Learning)
   - Include soft skills: Agile, mentoring, code reviews, documentation
6. Use ONLY information from above - never make up or assume anything
7. Be specific with numbers, technologies, and achievements from the data
8. If something isn't in the data, say "I don't have that specific information in my profile"

ANSWER AS DIWAN MALLA:`;

        // Step 3: Stream response
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are Diwan Malla. Answer questions accurately using the provided profile data. Speak in first person. When asked about projects, list ALL projects mentioned. Never fabricate information - use only what's provided.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1, // Very low for factual accuracy
          max_tokens: 800,
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
