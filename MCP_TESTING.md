# MCP Server Testing Guide

## ✅ MCP Server Status: RUNNING

Your Digital Twin MCP Server is successfully running and ready for GitHub Copilot integration!

## Server Information

- **Status**: ✅ Running
- **URL**: http://localhost:3000/api/mcp
- **Protocol**: JSON-RPC 2.0
- **Vector Database**: ✅ Connected (207 vectors loaded)
- **AI Model**: ✅ Groq (llama-3.1-8b-instant)

## Test Results

### 1. ✅ Ping Test (Health Check)
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'
```

**Result**: Server is responding correctly with status "ok"

### 2. ✅ Query Test (RAG Search)
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"query","params":{"question":"What is your name?"},"id":2}'
```

**Result**: Successfully returned "Diwan Malla" with relevant context

### 3. ✅ Capabilities Test
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"capabilities","id":3}'
```

**Result**: All methods available: ping, query, reload, capabilities

## GitHub Copilot Integration

### Step 1: Verify MCP Configuration
Your `.vscode/mcp.json` file is configured correctly:
```json
{
  "servers": {
    "digital-twin-mcp": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### Step 2: Enable MCP in VS Code Insiders

1. Open Command Palette (`Cmd+Shift+P` on macOS)
2. Search for "GitHub Copilot: Enable MCP Servers"
3. Select your project's `.vscode/mcp.json` configuration
4. Restart VS Code Insiders

### Step 3: Test with GitHub Copilot

Use these prompts in GitHub Copilot Chat:

#### Basic Query
```
@workspace Can you tell me about my work experience using the digital twin MCP server?
```

#### Skills Query
```
@workspace Using my digital twin data, what are my key technical skills?
```

#### Interview Prep
```
@workspace Query my digital twin MCP server to help me prepare for a technical interview. What projects should I highlight?
```

#### Career Goals
```
@workspace What are my career goals according to the digital twin MCP server?
```

## Available MCP Methods

### 1. `ping` - Health Check
Tests if the server is running.

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "id": 1
}
```

### 2. `query` - Ask Questions
Query your digital twin with natural language questions.

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "query",
  "params": {
    "question": "What are my technical skills?"
  },
  "id": 2
}
```

### 3. `reload` - Reload Profile Data
Reload your profile data from `digitaltwin.json` into the vector database.

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "reload",
  "id": 3
}
```

### 4. `capabilities` - List Available Methods
Get information about the server's capabilities.

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "capabilities",
  "id": 4
}
```

## Troubleshooting

### Server Not Responding
- ✅ Verify server is running: `pnpm dev`
- ✅ Check server logs in terminal
- ✅ Test endpoint directly: `curl http://localhost:3000/api/mcp`

### GitHub Copilot Not Using MCP
- Ensure you're using VS Code Insiders (latest version)
- Restart VS Code after creating `.vscode/mcp.json`
- Use `@workspace` prefix in your prompts
- Check that MCP servers are enabled in settings

### No Digital Twin Responses
- ✅ Server is running: http://localhost:3000
- ✅ Vector database has 207 vectors loaded
- ✅ Environment variables configured correctly
- ✅ Test queries returning correct results

## Next Steps

1. ✅ MCP configuration file created
2. ✅ MCP server endpoint implemented
3. ✅ Server tested and verified working
4. ⏭️ Enable MCP in VS Code Insiders
5. ⏭️ Test with GitHub Copilot using sample prompts

## Server Logs to Monitor

When using the MCP server, watch for these log messages:

✅ **Successful Operations:**
- `[MCP] Received method: query`
- `[RAG] Searching for: [question]`
- `[RAG] Found [N] relevant results`
- `[Groq] Generating response...`

❌ **Errors to Watch For:**
- `UPSTASH_VECTOR_REST_URL is undefined`
- `GROQ_API_KEY not found`
- `Error connecting to vector database`
- `Method not found`

## Documentation Links

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [GitHub Copilot MCP Integration](https://docs.github.com/en/copilot)
- [Upstash Vector Documentation](https://upstash.com/docs/vector)
- [Groq API Documentation](https://console.groq.com/docs)

---

**Status**: Ready for GitHub Copilot Integration ✅
**Last Updated**: October 15, 2025
