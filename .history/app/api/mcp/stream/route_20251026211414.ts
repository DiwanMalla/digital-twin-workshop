import { Index } from "@upstash/vector";
import Groq from "groq-sdk";
import { storeConversation, extractTopics, findSimilarConversations } from "@/lib/learning";

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
  console.log(`[Learning] Found ${similarConversations.length} similar conversations`);

  const stream = new ReadableStream({
    async start(controller) {
      let fullAnswer = ""; // Store complete answer for learning
      
      try {
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
          conversationalResponse = `Hey! 😊 I'm doing great, thanks for asking! I'm Diwan Malla's Digital Twin, and I'm here and ready to chat about his professional journey.

I'm excited to share information about:
• His technical skills and expertise
• Work experience and achievements
• Cool projects he's built
• Career goals and what he's learning

How about you? What brings you here today? Feel free to ask me anything about Diwan's background! 🚀`;
        }
        // Check for "nice to meet you" type responses
        else if (niceToMeet.test(question.trim())) {
          conversationalResponse = `Nice to meet you too! 🤝 I'm really excited to chat with you!

I'm Diwan Malla's Digital Twin, and I love talking about:
• His technical skills (React, Next.js, Python, and more!)
• Awesome projects like Job Tracker, PDFly, SangeetX, and BrainiX
• His work experience and achievements
• Career goals and aspirations

What would you like to know about him? I'm all ears! 👂`;
        }
        // Check for simple greetings
        else if (casualGreetings.test(question.trim())) {
          conversationalResponse = `Hello! 👋 I'm Diwan Malla's Digital Twin - an AI assistant trained on his professional profile.

I can help you learn about:
• Technical skills and expertise (React, Next.js, Node.js, Python, etc.)
• Work experience and achievements
• Portfolio projects (Job Tracker, PDFly, SangeetX, BrainiX)
• Career goals and aspirations
• Education and certifications

Feel free to ask me anything! For example:
- "What are your technical skills?"
- "Tell me about your projects"
- "What's your work experience?"
- "What are you looking for in your next role?"

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
          .map((r, i) => {
            const title = r.metadata?.title || `Result ${i + 1}`;
            const content = r.metadata?.content || r.metadata?.text || "";
            const type = r.metadata?.type || r.metadata?.category || "";

            // Format with type for better context
            return `[${type ? `${type} - ` : ""}${title}]\n${content}`;
          })
          .filter((part) => part.length > 10); // Filter out empty/short results

        const context = contextParts.join("\n\n---\n\n");

        console.log("[Stream] Context length:", context.length);
        console.log("[Stream] Number of context parts:", contextParts.length);
        console.log(
          "[Stream] Context titles:",
          results.slice(0, 5).map((r) => r.metadata?.title)
        );

        // Ensure we have context
        if (!context || context.trim().length === 0) {
          throw new Error(
            "No relevant information found in database. Please try rephrasing your question."
          );
        }

        const prompt = `You are Diwan Malla. Answer this question using ONLY the information provided below from your profile.

YOUR PROFILE INFORMATION:
${context}

QUESTION: ${question}

CRITICAL RULES:
1. Answer in first person as "I" (you ARE Diwan Malla)
2. Use ONLY information from the profile data above - never fabricate or assume anything
3. Be specific with numbers, technologies, achievements, and dates from the data
4. If information isn't in the data, say "I don't have that specific information in my profile"

QUESTION-SPECIFIC GUIDANCE:
- Identity questions ("name", "who are you"): Answer directly and concisely
- Skills/Technology questions: Organize by category (Frontend, Backend, Databases, Cloud, etc.), include expertise levels
- Project questions: List ALL projects with name, duration, technologies, and impact metrics
- Experience questions: Include company, role, duration, achievements with quantified results
- Career/Goals questions: Current level, target roles, industries interested in
- Achievements: Always include specific metrics (percentages, time saved, improvements)
- Learning questions: Mention certifications, current learning focus, and learning agility examples

IMPORTANT: 
- For projects, list: Job Tracker, PDFly, SangeetX, BrainiX (if mentioned in data)
- For work, include: Barnamala Tech (current), Hamro Chautari, Bihani Tech, Adira Tech (if mentioned in data)
- Don't mix work experience with personal projects - they are different
- Include expertise levels: Expert (React, Next.js, TypeScript), Advanced (Node.js, AWS), Learning (C#, .NET)

ANSWER AS DIWAN MALLA:`;

        // Step 3: Stream response
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are Diwan Malla, a Full-Stack Developer. Answer questions accurately using ONLY the provided profile data. Always speak in first person. Organize information clearly (by category for skills, chronologically for experience). Include specific metrics and technologies. Never fabricate - if information isn't provided, say so. Distinguish between personal projects and work experience.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1, // Very low for factual accuracy
          max_tokens: 1000, // Increased for comprehensive answers
          stream: true,
        });

        // Stream tokens as they arrive
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content })}\n\n`
              )
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
