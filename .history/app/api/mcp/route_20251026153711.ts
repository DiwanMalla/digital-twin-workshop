import { NextRequest, NextResponse } from "next/server";
import { performRAGQuery, performEnhancedRAGQuery, loadProfileData, compareRAGApproaches } from "@/lib/actions";

/**
 * MCP Server Main Endpoint
 * Implements JSON-RPC 2.0 protocol for Model Context Protocol
 * 
 * Supported methods:
 * - initialize: Initialize MCP connection (required for VS Code Insiders)
 * - ping: Health check
 * - query: Ask questions about the digital twin
 * - reload: Reload profile data into vector database
 * - capabilities: List available methods
 */

interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body: JSONRPCRequest = await request.json();

    // Validate JSON-RPC 2.0 format
    if (body.jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be '2.0'",
        },
        id: body.id || null,
      });
    }

    if (!body.method) {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request: method is required",
        },
        id: body.id || null,
      });
    }

    console.log(`[MCP] Received method: ${body.method}`);

    // Handle different MCP methods
    switch (body.method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {
                listChanged: false
              },
              prompts: {
                listChanged: false
              },
              resources: {
                listChanged: false
              },
            },
            serverInfo: {
              name: "digital-twin-mcp",
              version: "1.0.0",
            },
          },
          id: body.id,
        });

      case "ping":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            status: "ok",
            message: "Digital Twin MCP Server is running",
            timestamp: new Date().toISOString(),
          },
          id: body.id,
        });

      case "query":
        const question = body.params?.question;
        const useEnhanced = body.params?.enhanced !== false; // Default to enhanced
        
        if (!question || typeof question !== "string") {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: "Invalid params: question is required and must be a string",
            },
            id: body.id,
          });
        }

        const queryResult = useEnhanced 
          ? await performEnhancedRAGQuery(question)
          : await performRAGQuery(question);
        
        return NextResponse.json({
          jsonrpc: "2.0",
          result: queryResult,
          id: body.id,
        });

      case "query_enhanced":
        const enhancedQuestion = body.params?.question;
        
        if (!enhancedQuestion || typeof enhancedQuestion !== "string") {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: "Invalid params: question is required and must be a string",
            },
            id: body.id,
          });
        }

        const enhancedResult = await performEnhancedRAGQuery(enhancedQuestion);
        
        return NextResponse.json({
          jsonrpc: "2.0",
          result: enhancedResult,
          id: body.id,
        });

      case "query_basic":
        const basicQuestion = body.params?.question;
        
        if (!basicQuestion || typeof basicQuestion !== "string") {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: "Invalid params: question is required and must be a string",
            },
            id: body.id,
          });
        }

        const basicResult = await performRAGQuery(basicQuestion);
        
        return NextResponse.json({
          jsonrpc: "2.0",
          result: basicResult,
          id: body.id,
        });

      case "compare":
        const compareQuestion = body.params?.question;
        
        if (!compareQuestion || typeof compareQuestion !== "string") {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: "Invalid params: question is required and must be a string",
            },
            id: body.id,
          });
        }

        const comparison = await compareRAGApproaches(compareQuestion);
        
        return NextResponse.json({
          jsonrpc: "2.0",
          result: comparison,
          id: body.id,
        });

      case "reload":
        const reloadResult = await loadProfileData();
        
        return NextResponse.json({
          jsonrpc: "2.0",
          result: reloadResult,
          id: body.id,
        });

      case "tools/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: [
              {
                name: "query_digital_twin",
                description: "Query the digital twin about professional background, skills, experience, and projects",
                inputSchema: {
                  type: "object",
                  properties: {
                    question: {
                      type: "string",
                      description: "The question to ask about the digital twin"
                    }
                  },
                  required: ["question"]
                }
              }
            ]
          },
          id: body.id,
        });

      case "tools/call":
        const toolName = body.params?.name;
        const toolArgs = body.params?.arguments as { question?: string } | undefined;
        
        if (toolName === "query_digital_twin" && toolArgs?.question) {
          const result = await performRAGQuery(toolArgs.question);
          return NextResponse.json({
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: result.answer
                }
              ]
            },
            id: body.id,
          });
        }
        
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid tool call parameters",
          },
          id: body.id,
        });

      case "resources/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            resources: []
          },
          id: body.id,
        });

      case "prompts/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            prompts: []
          },
          id: body.id,
        });

      case "capabilities":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            methods: ["initialize", "ping", "query", "query_enhanced", "query_basic", "compare", "reload", "capabilities", "tools/list", "tools/call", "resources/list", "prompts/list"],
            description: "Digital Twin RAG MCP Server with LLM Enhancement",
            version: "2.0.0",
            endpoints: {
              initialize: "Initialize MCP connection",
              query: "Ask questions (uses enhanced RAG by default)",
              query_enhanced: "Ask questions with LLM-enhanced preprocessing and formatting",
              query_basic: "Ask questions with basic RAG (no LLM enhancement)",
              compare: "Compare basic vs enhanced RAG responses side-by-side",
              reload: "Reload profile data into vector database",
              ping: "Health check",
              "tools/list": "List available tools",
              "tools/call": "Call a tool",
            },
          },
          id: body.id,
        });

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`,
            data: {
              availableMethods: ["initialize", "ping", "query", "query_enhanced", "query_basic", "compare", "reload", "capabilities", "tools/list", "tools/call", "resources/list", "prompts/list"],
            },
          },
          id: body.id,
        });
    }
  } catch (error) {
    console.error("[MCP] Error:", error);
    
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
      id: null,
    });
  }
}

// GET endpoint for browser access and health checks
export async function GET() {
  return NextResponse.json({
    name: "Digital Twin MCP Server",
    version: "2.0.0",
    protocol: "JSON-RPC 2.0",
    status: "running",
    features: {
      basicRAG: "Vector search + AI generation",
      enhancedRAG: "LLM-powered query enhancement + interview-focused responses",
      comparison: "Side-by-side A/B testing of basic vs enhanced",
    },
    endpoints: {
      POST: {
        description: "JSON-RPC 2.0 endpoint for MCP operations",
        methods: ["initialize", "ping", "query", "query_enhanced", "query_basic", "compare", "reload", "capabilities"],
      },
    },
    documentation: "Send POST requests with JSON-RPC 2.0 format",
    examples: {
      basicQuery: {
        jsonrpc: "2.0",
        method: "query_basic",
        params: { question: "What is your name?" },
        id: 1,
      },
      enhancedQuery: {
        jsonrpc: "2.0",
        method: "query_enhanced",
        params: { question: "Tell me about your best project for an interview" },
        id: 2,
      },
      comparison: {
        jsonrpc: "2.0",
        method: "compare",
        params: { question: "What are your key strengths?" },
        id: 3,
      },
    },
  });
}
