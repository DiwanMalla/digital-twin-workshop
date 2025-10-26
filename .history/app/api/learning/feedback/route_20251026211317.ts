import { NextRequest, NextResponse } from "next/server";
import {
  updateConversationFeedback,
  reinforcePositivePatterns,
} from "@/lib/learning";

/**
 * POST /api/learning/feedback
 * Submit feedback for a conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, feedback } = body;

    if (!conversationId || !feedback) {
      return NextResponse.json(
        { error: "Missing conversationId or feedback" },
        { status: 400 }
      );
    }

    if (feedback !== "positive" && feedback !== "negative") {
      return NextResponse.json(
        { error: "Feedback must be 'positive' or 'negative'" },
        { status: 400 }
      );
    }

    const result = await updateConversationFeedback(conversationId, feedback);

    // If positive, reinforce the pattern
    if (feedback === "positive") {
      await reinforcePositivePatterns(conversationId);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Feedback API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to submit feedback",
      },
      { status: 500 }
    );
  }
}
