import { NextResponse } from "next/server";
import { analyzeJobMatch } from "@/lib/job-matcher";

/**
 * POST /api/job-match
 * Analyze job description and calculate match score
 */
export async function POST(request: Request) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    if (jobDescription.length > 10000) {
      return NextResponse.json(
        { error: "Job description is too long (max 10,000 characters)" },
        { status: 400 }
      );
    }

    const analysis = await analyzeJobMatch(jobDescription);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[Job Match API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze job match",
      },
      { status: 500 }
    );
  }
}
