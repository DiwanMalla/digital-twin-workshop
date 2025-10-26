import { NextResponse } from "next/server";
import { getLearningMetrics, getImprovementSuggestions } from "@/lib/learning";

/**
 * GET /api/learning/metrics
 * Get learning system metrics
 */
export async function GET() {
  try {
    const metrics = await getLearningMetrics();
    const improvements = await getImprovementSuggestions();

    return NextResponse.json({
      success: true,
      metrics: {
        totalConversations: metrics.totalConversations,
        positiveRatings: metrics.positiveRatings,
        negativeRatings: metrics.negativeRatings,
        satisfactionRate:
          metrics.totalConversations > 0
            ? (metrics.positiveRatings /
                (metrics.positiveRatings + metrics.negativeRatings || 1)) *
              100
            : 0,
        averageConfidence: metrics.averageConfidence,
        popularTopics: Array.from(metrics.popularTopics.entries()).map(
          ([topic, count]) => ({ topic, count })
        ),
      },
      improvementsNeeded: improvements.length,
      topImprovements: improvements.slice(0, 5),
    });
  } catch (error) {
    console.error("[Metrics API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get metrics",
      },
      { status: 500 }
    );
  }
}
