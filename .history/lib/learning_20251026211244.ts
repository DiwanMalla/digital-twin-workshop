import { getVectorIndex } from "./upstash";

/**
 * Learning System for Digital Twin
 * Enables the AI to learn from user interactions and improve over time
 */

export interface Conversation {
  id: string;
  question: string;
  answer: string;
  feedback?: "positive" | "negative";
  timestamp: Date;
  metadata?: {
    sources?: string[];
    confidence?: number;
    category?: string;
  };
}

export interface LearningMetrics {
  totalConversations: number;
  positiveRatings: number;
  negativeRatings: number;
  popularTopics: Map<string, number>;
  averageConfidence: number;
}

/**
 * Store conversation for learning
 */
export async function storeConversation(conversation: Omit<Conversation, "id">) {
  const id = `conversation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const conversationData: Conversation = {
    id,
    ...conversation,
  };

  try {
    const index = getVectorIndex();
    
    // Store conversation as a vector for semantic search of past interactions
    await index.upsert({
      id,
      data: `Question: ${conversation.question}\nAnswer: ${conversation.answer}`,
      metadata: {
        type: "conversation",
        question: conversation.question,
        answer: conversation.answer,
        feedback: conversation.feedback,
        timestamp: conversation.timestamp.toISOString(),
        category: conversation.metadata?.category || "general",
        confidence: conversation.metadata?.confidence || 0,
      },
    });

    console.log(`[Learning] Stored conversation: ${id}`);
    return conversationData;
  } catch (error) {
    console.error("[Learning] Error storing conversation:", error);
    throw error;
  }
}

/**
 * Update feedback for a conversation
 */
export async function updateConversationFeedback(
  conversationId: string,
  feedback: "positive" | "negative"
) {
  try {
    const index = getVectorIndex();
    
    // Fetch the conversation
    const result = await index.fetch([conversationId]);
    
    if (!result || result.length === 0) {
      throw new Error("Conversation not found");
    }

    const conv = result[0];
    
    if (!conv) {
      throw new Error("Conversation data is null");
    }
    
    // Update with new feedback
    await index.upsert({
      id: conversationId,
      data: conv.data as string,
      metadata: {
        ...(conv.metadata || {}),
        feedback,
        feedbackTimestamp: new Date().toISOString(),
      },
    });

    console.log(`[Learning] Updated feedback for ${conversationId}: ${feedback}`);
    
    // If negative feedback, mark for improvement
    if (feedback === "negative" && conv.metadata) {
      await markForImprovement(conversationId, conv.metadata as Record<string, unknown>);
    }
    
    return { success: true, conversationId, feedback };
  } catch (error) {
    console.error("[Learning] Error updating feedback:", error);
    throw error;
  }
}

/**
 * Mark a conversation for improvement
 */
async function markForImprovement(
  conversationId: string,
  metadata: Record<string, unknown>
) {
  try {
    const index = getVectorIndex();
    
    // Create an improvement task
    const improvementId = `improvement_${Date.now()}`;
    
    await index.upsert({
      id: improvementId,
      data: `Needs improvement: ${metadata.question as string}`,
      metadata: {
        type: "improvement_needed",
        originalConversationId: conversationId,
        question: metadata.question,
        answer: metadata.answer,
        timestamp: new Date().toISOString(),
        status: "pending",
      },
    });

    console.log(`[Learning] Marked for improvement: ${improvementId}`);
  } catch (error) {
    console.error("[Learning] Error marking for improvement:", error);
  }
}

/**
 * Find similar past conversations
 */
export async function findSimilarConversations(
  question: string,
  limit = 3
): Promise<Conversation[]> {
  try {
    const index = getVectorIndex();
    
    const results = await index.query({
      data: question,
      topK: limit * 2, // Get more to filter
      includeMetadata: true,
      filter: "type = 'conversation'",
    });

    const conversations: Conversation[] = results
      .filter((r) => r.metadata?.type === "conversation")
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        question: r.metadata?.question as string,
        answer: r.metadata?.answer as string,
        feedback: r.metadata?.feedback as "positive" | "negative" | undefined,
        timestamp: new Date(r.metadata?.timestamp as string),
        metadata: {
          category: r.metadata?.category as string,
          confidence: r.metadata?.confidence as number,
        },
      }));

    return conversations;
  } catch (error) {
    console.error("[Learning] Error finding similar conversations:", error);
    return [];
  }
}

/**
 * Get learning metrics
 */
export async function getLearningMetrics(): Promise<LearningMetrics> {
  try {
    const index = getVectorIndex();
    
    // Query all conversations
    const results = await index.query({
      data: "conversation history metrics",
      topK: 1000,
      includeMetadata: true,
      filter: "type = 'conversation'",
    });

    let positiveCount = 0;
    let negativeCount = 0;
    let totalConfidence = 0;
    const topicCounts = new Map<string, number>();

    results.forEach((r) => {
      if (r.metadata?.feedback === "positive") positiveCount++;
      if (r.metadata?.feedback === "negative") negativeCount++;
      
      const confidence = r.metadata?.confidence as number;
      if (confidence) totalConfidence += confidence;
      
      const category = (r.metadata?.category as string) || "general";
      topicCounts.set(category, (topicCounts.get(category) || 0) + 1);
    });

    return {
      totalConversations: results.length,
      positiveRatings: positiveCount,
      negativeRatings: negativeCount,
      popularTopics: topicCounts,
      averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
    };
  } catch (error) {
    console.error("[Learning] Error getting metrics:", error);
    return {
      totalConversations: 0,
      positiveRatings: 0,
      negativeRatings: 0,
      popularTopics: new Map(),
      averageConfidence: 0,
    };
  }
}

/**
 * Extract key topics from a question
 */
export function extractTopics(question: string): string[] {
  const topics: string[] = [];
  
  const lowerQuestion = question.toLowerCase();
  
  // Technical skills
  if (lowerQuestion.match(/\b(javascript|typescript|react|next\.?js|node\.?js|python|java)\b/i)) {
    topics.push("technical_skills");
  }
  
  // Projects
  if (lowerQuestion.match(/\b(project|built|created|developed|github|repository)\b/i)) {
    topics.push("projects");
  }
  
  // Experience
  if (lowerQuestion.match(/\b(experience|work|job|company|role|position)\b/i)) {
    topics.push("experience");
  }
  
  // Education
  if (lowerQuestion.match(/\b(education|degree|university|college|study|learn)\b/i)) {
    topics.push("education");
  }
  
  // Personal
  if (lowerQuestion.match(/\b(name|who|about|yourself|background)\b/i)) {
    topics.push("personal");
  }
  
  return topics.length > 0 ? topics : ["general"];
}

/**
 * Learn from positive feedback by reinforcing similar patterns
 */
export async function reinforcePositivePatterns(conversationId: string) {
  try {
    const index = getVectorIndex();
    
    // Fetch the highly-rated conversation
    const result = await index.fetch([conversationId]);
    
    if (!result || result.length === 0) return;
    
    const conv = result[0];
    
    // Create a reinforcement entry
    const reinforcementId = `reinforcement_${Date.now()}`;
    
    await index.upsert({
      id: reinforcementId,
      data: conv.data as string,
      metadata: {
        type: "reinforcement",
        originalId: conversationId,
        question: conv.metadata?.question,
        answer: conv.metadata?.answer,
        category: conv.metadata?.category,
        timestamp: new Date().toISOString(),
        weight: 1.5, // Higher weight for positive examples
      },
    });

    console.log(`[Learning] Reinforced positive pattern: ${reinforcementId}`);
  } catch (error) {
    console.error("[Learning] Error reinforcing positive patterns:", error);
  }
}

/**
 * Suggest improvements based on negative feedback
 */
export async function getImprovementSuggestions(): Promise<{
  question: string;
  currentAnswer: string;
  suggestedImprovement: string;
}[]> {
  try {
    const index = getVectorIndex();
    
    const results = await index.query({
      data: "improvement needed",
      topK: 10,
      includeMetadata: true,
      filter: "type = 'improvement_needed' AND status = 'pending'",
    });

    return results.map((r) => ({
      question: r.metadata?.question as string,
      currentAnswer: r.metadata?.answer as string,
      suggestedImprovement: "Review and update the knowledge base with more accurate information",
    }));
  } catch (error) {
    console.error("[Learning] Error getting improvement suggestions:", error);
    return [];
  }
}
