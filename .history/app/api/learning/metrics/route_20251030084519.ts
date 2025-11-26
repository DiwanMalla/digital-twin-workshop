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

    const totalRatings = metrics.positiveRatings + metrics.negativeRatings;
    const satisfactionRate =
      totalRatings > 0 ? (metrics.positiveRatings / totalRatings) * 100 : 0;

    // Sort topics by count descending
    const popularTopics = Array.from(metrics.popularTopics.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 topics

    return NextResponse.json({
      totalConversations: metrics.totalConversations,
      positiveRatings: metrics.positiveRatings,
      negativeRatings: metrics.negativeRatings,
      satisfactionRate,
      averageConfidence: metrics.averageConfidence,
      popularTopics,
      improvementsNeeded: improvements.length,
      topImprovements: improvements.slice(0, 5),
    });
  } catch (error) {
    console.error("[Metrics API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get metrics",
      },
      { status: 500 }
    );
  }
}
