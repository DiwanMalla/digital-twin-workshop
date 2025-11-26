import { Index } from "@upstash/vector";
import Groq from "groq-sdk";
import {
  storeConversation,
  extractTopics,
  findSimilarConversations,
} from "@/lib/learning";
import { getExternalKnowledge } from "@/lib/external-knowledge";

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

  // Check for similar past conversations to learn from
  const similarConversations = await findSimilarConversations(question, 2);
  console.log(
    `[Learning] Found ${similarConversations.length} similar conversations`
  );

  const stream = new ReadableStream({
    async start(controller) {
      let fullAnswer = ""; // Store complete answer for learning

      try {
        // Check external knowledge first (time, calculations, definitions, etc.)
        const externalKnowledge = getExternalKnowledge(question);
        if (externalKnowledge && externalKnowledge.confidence >= 0.9) {
          // High confidence external answer - stream it directly
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`)
          );

          const response = externalKnowledge.answer;
          fullAnswer = response;

          // Stream the answer
          for (const char of response) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: char })}\n\n`
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 20));
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();

          // Store the conversation for learning
          const topics = extractTopics(question);
          await storeConversation({
            question,
            answer: fullAnswer,
            timestamp: new Date(),
            feedback: undefined,
            metadata: {
              sources: [externalKnowledge.source],
              confidence: externalKnowledge.confidence,
              category: topics.join(", "),
            },
          });

          return;
        }

        // Handle casual conversations and greetings
        const casualGreetings =
          /^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening|sup|wassup|yo)[\s!?.]*$/i;
        const howAreYou =
          /^(how are you|how r u|how're you|how are ya|hows it going|how's it going|what's up|whats up|whatcha doing|what are you doing)[\s!?.]*$/i;
        const niceToMeet =
          /^(nice to meet you|pleasure to meet you|good to meet you)[\s!?.]*$/i;

        let conversationalResponse = "";

        // Check for "how are you" type questions
        if (howAreYou.test(question.trim())) {
          conversationalResponse = `Hey! 😊 I'm doing great, thanks for asking! Happy to chat about my work, projects, or anything else you'd like to know.

Feel free to ask me about:
• My technical skills and expertise
• Work experience and achievements
• Projects I've built
• Career goals

What would you like to know?`;
        }
        // Check for "nice to meet you" type responses
        else if (niceToMeet.test(question.trim())) {
          conversationalResponse = `Nice to meet you too! 🤝

I'd love to tell you about:
• My technical skills (React, Next.js, Python, and more!)
• Projects like Job Tracker, PDFly, SangeetX, and BrainiX
• My work experience and achievements
• Career goals and aspirations

What would you like to know? 😊`;
        }
        // Check for simple greetings
        else if (casualGreetings.test(question.trim())) {
          conversationalResponse = `Hello! 👋 I'm Diwan Malla, a Full-Stack Developer based in Sydney.

I can tell you about:
• Technical skills (React, Next.js, Node.js, Python, etc.)
• Work experience and achievements
• Portfolio projects (Job Tracker, PDFly, SangeetX, BrainiX)
• Career goals and aspirations

Feel free to ask me anything! For example:
- "What are your technical skills?"
- "Tell me about your projects"
- "What's your work experience?"

What would you like to know? 😊`;
        }

        // If we matched a conversational pattern, stream the response
        if (conversationalResponse) {
          for (const char of conversationalResponse) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: char })}\n\n`
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
          return;
        }

        // Send status update
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "status",
              message: "Searching vector database...",
            })}\n\n`
          )
        );

        // Step 1: Vector search - search for relevant content
        // Smart query enhancement based on question intent
        const lowerQuestion = question.toLowerCase();
        let enhancedQuery = question;

        // Detect question intent and add semantic keywords
        const intentKeywords: Record<string, string> = {
          // Projects & Work
          "project|portfolio|built|developed|created|made":
            "portfolio projects built developed created applications Job Tracker PDFly SangeetX BrainiX",
          "experience|work|job|employment|company|career":
            "work experience employment career history Barnamala Hamro Chautari achievements responsibilities",

          // Skills & Technologies
          "skill|technolog|expertise|proficien|know|language|framework|tool":
            "technical skills expertise programming languages frameworks libraries React Next.js Node.js TypeScript Python JavaScript",
          "frontend|front-end|ui|interface|react|angular|vue":
            "frontend front-end UI React Next.js TypeScript Material UI Tailwind CSS responsive design",
          "backend|back-end|server|api|database":
            "backend back-end server Node.js Express Python Flask REST API PostgreSQL MongoDB",
          "cloud|aws|deploy|devops|cicd|ci/cd":
            "cloud AWS DevOps CI/CD GitHub Actions Docker deployment infrastructure",

          // Education & Certifications
          "education|degree|university|college|certification|course":
            "education Bachelor degree Victoria University IBM Meta certification training",

          // Personal & Identity
          "name|who|identity": "name Diwan Malla identity Full-Stack Developer",
          "location|where|live|based":
            "location Sydney Australia remote relocation",
          "salary|compensation|pay|expectation":
            "salary compensation expectations mid-level senior AUD",

          // Career Goals
          "goal|future|aspiration|looking for|seeking|want":
            "career goals aspirations target senior technical lead AI/ML SaaS",
          "learning|learn|study|upskill":
            "learning professional development certifications courses C# .NET Angular",

          // Soft Skills & Leadership
          "leadership|lead|mentor|team|manage|collaborate":
            "leadership mentoring team collaboration Agile cross-functional code reviews",
          "achievement|accomplishment|success|impact|result":
            "achievements impact results metrics improvements performance 35% 40% 95%",
        };

        // Find matching intent and enhance query
        for (const [pattern, keywords] of Object.entries(intentKeywords)) {
          const regex = new RegExp(pattern, "i");
          if (regex.test(lowerQuestion)) {
            enhancedQuery = `${question} ${keywords}`;
            console.log(`[Query Enhancement] Detected intent: ${pattern}`);
            console.log(`[Query Enhancement] Enhanced query: ${enhancedQuery}`);
            break; // Use first matching pattern
          }
        }

        const results = await index.query({
          data: enhancedQuery,
          topK: 20, // Increased to capture more relevant results
          includeMetadata: true,
        });

        // Log search results for debugging
        console.log("[Stream] Vector search results:", results.length);
        results.forEach((r, i) => {
          console.log(
            `[Stream] Match ${i + 1}: score=${r.score?.toFixed(3)}, title="${
              r.metadata?.title
            }"`
          );
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "status",
              message: "Generating response...",
            })}\n\n`
          )
        );

        // Step 2: Build context from search results
        const contextParts = results
          .filter((r) => (r.score || 0) > 0.5) // Only use results with good scores
          .map((r) => {
            // Only include content, NOT titles or types (to avoid LLM referencing section names)
            const content = r.metadata?.content || r.metadata?.text || "";
            return content;
          })
          .filter((part) => String(part).length > 10); // Filter out empty/short results

        const context = contextParts.join("\n\n---\n\n");

        console.log("[Stream] Context length:", context.length);
        console.log("[Stream] Number of context parts:", contextParts.length);
        console.log(
          "[Stream] Context titles:",
          results.slice(0, 5).map((r) => r.metadata?.title)
        );

        // Check for external knowledge that might help
        const externalInfo = getExternalKnowledge(question);
        const externalContext = externalInfo
          ? `\n\nADDITIONAL CONTEXT:\n${externalInfo.answer}\n(Source: ${externalInfo.source})`
          : "";

        // Ensure we have context
        if (!context || context.trim().length === 0) {
          // If no vector context but we have external knowledge, use it
          if (externalInfo) {
            const response = externalInfo.answer;
            fullAnswer = response;

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`)
            );
            for (const char of response) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "token",
                    content: char,
                  })}\n\n`
                )
              );
              await new Promise((resolve) => setTimeout(resolve, 20));
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
            controller.close();

            const topics = extractTopics(question);
            await storeConversation({
              question,
              answer: fullAnswer,
              timestamp: new Date(),
              feedback: undefined,
              metadata: {
                sources: [externalInfo.source],
                confidence: externalInfo.confidence,
                category: topics.join(", "),
              },
            });
            return;
          }

          throw new Error(
            "No relevant information found in database. Please try rephrasing your question."
          );
        }

        const prompt = `You are Diwan Malla having a natural conversation. Answer this question as yourself.

Your info:
${context}${externalContext}

Question: "${question}"

RULES:
- Answer like a normal person talking casually
- NEVER say "mentioned in", "according to", "in my profile", "under section", or any reference to data sources
- For yes/no questions: Start with "Yes" or "No" then briefly explain naturally
- Example: "Are you an international student?" → "Yes, I am! I'm currently studying in Australia."
- Use contractions (I'm, I've, don't) to sound human
- Be brief and conversational
- Speak as "I" - you ARE Diwan Malla

Your natural answer:`;

        // Step 3: Stream response
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are Diwan Malla answering questions naturally. CRITICAL: Never say 'this is mentioned in my profile' or 'under section' or reference ANY data sources. Just answer like a normal human having a conversation. For 'are you an international student?' just say 'Yes, I am!' naturally. Use contractions and be friendly.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7, // Higher for more natural responses
          max_tokens: 500,
          stream: true,
        });

        // Stream tokens as they arrive
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullAnswer += content; // Accumulate full answer
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content })}\n\n`
              )
            );
          }
        }

        // Store conversation for learning and get the ID
        const topics = extractTopics(question);
        const storedConversation = await storeConversation({
          question,
          answer: fullAnswer,
          timestamp: new Date(),
          metadata: {
            sources: results
              .map((r) => r.metadata?.title as string)
              .filter(Boolean),
            confidence: results.length > 0 ? results[0].score : 0,
            category: topics[0] || "general",
          },
        }).catch((err) => {
          console.error("[Learning] Failed to store conversation:", err);
          return null;
        });

        // Send done signal with conversationId
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              conversationId: storedConversation?.id,
            })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
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
