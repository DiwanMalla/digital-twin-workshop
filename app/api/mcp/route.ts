import { NextRequest, NextResponse } from "next/server";
import { performRAGQuery, loadProfileData } from "@/lib/actions";

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
  params?: Record<string, any>;
  id: string | number;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
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

        const queryResult = await performRAGQuery(question);
        
        return NextResponse.json({
          jsonrpc: "2.0",
          result: queryResult,
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
        const toolArgs = body.params?.arguments;
        
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
            methods: ["initialize", "ping", "query", "reload", "capabilities", "tools/list", "tools/call", "resources/list", "prompts/list"],
            description: "Digital Twin RAG MCP Server",
            version: "1.0.0",
            endpoints: {
              initialize: "Initialize MCP connection",
              query: "Ask questions about professional background",
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
              availableMethods: ["initialize", "ping", "query", "reload", "capabilities", "tools/list", "tools/call", "resources/list", "prompts/list"],
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
    version: "1.0.0",
    protocol: "JSON-RPC 2.0",
    status: "running",
    endpoints: {
      POST: {
        description: "JSON-RPC 2.0 endpoint for MCP operations",
        methods: ["initialize", "ping", "query", "reload", "capabilities"],
      },
    },
    documentation: "Send POST requests with JSON-RPC 2.0 format",
    example: {
      jsonrpc: "2.0",
      method: "query",
      params: { question: "What is your name?" },
      id: 1,
    },
  });
}
