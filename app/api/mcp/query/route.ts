import { NextRequest, NextResponse } from "next/server";
import { performRAGQuery, loadProfileData } from "@/lib/actions";

/**
 * MCP Server API endpoint for RAG queries
 * Follows the roll dice pattern for MCP server implementation
 * 
 * POST /api/mcp/query - Query the digital twin with a question
 * GET /api/mcp/query - Load/verify profile data in vector database
 */

// POST /api/mcp/query - Query the digital twin
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("[API] Received RAG query request");
    
    const body = await request.json();
    const { question } = body;

    // Validate input
    if (!question || typeof question !== "string") {
      console.warn("[API] Invalid request: missing or invalid question");
      return NextResponse.json(
        { 
          error: "Question is required and must be a string",
          success: false 
        },
        { status: 400 }
      );
    }

    if (question.trim().length === 0) {
      return NextResponse.json(
        { 
          error: "Question cannot be empty",
          success: false 
        },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { 
          error: "Question too long (max 500 characters)",
          success: false 
        },
        { status: 400 }
      );
    }

    // Perform RAG query
    const result = await performRAGQuery(question);
    
    const duration = Date.now() - startTime;
    console.log(`[API] Request completed in ${duration}ms`);

    return NextResponse.json({
      ...result,
      requestTime: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API] Error after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/mcp/query - Load profile data
export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log("[API] Loading profile data...");
    
    const result = await loadProfileData();
    
    const duration = Date.now() - startTime;
    console.log(`[API] Profile load completed in ${duration}ms`);
    
    return NextResponse.json({
      ...result,
      loadTime: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API] Error loading profile data after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        error: "Failed to load profile data",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
