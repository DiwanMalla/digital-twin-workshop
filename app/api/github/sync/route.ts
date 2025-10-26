import { NextResponse } from "next/server";
import { syncGitHubToVector, getLastSyncTime } from "@/lib/github-sync";

/**
 * POST /api/github/sync
 * Trigger a manual GitHub sync
 */
export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Starting GitHub sync for: ${username}`);

    const result = await syncGitHubToVector(username);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] GitHub sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github/sync
 * Get the last sync status and timestamp
 */
export async function GET() {
  try {
    const lastSync = await getLastSyncTime();

    return NextResponse.json({
      last_sync: lastSync,
      has_synced: lastSync !== null,
    });
  } catch (error) {
    console.error("[API] Error getting sync status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
