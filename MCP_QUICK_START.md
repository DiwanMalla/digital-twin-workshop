# GitHub Copilot MCP Integration - Quick Reference

## 🚀 Setup Complete!

Your Digital Twin MCP Server is ready for GitHub Copilot integration.

## Quick Start

### 1. Server Status
```bash
# Check if server is running
curl http://localhost:3000/api/mcp

# Start server (if not running)
pnpm dev
```

### 2. Enable in VS Code Insiders
1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Search: "GitHub Copilot: Enable MCP Servers"
3. Select `.vscode/mcp.json`
4. Restart VS Code Insiders

### 3. Test with Copilot
Use `@workspace` prefix in GitHub Copilot Chat:

```
@workspace Tell me about my work experience using the digital twin MCP server
```

## Sample Prompts for Testing

### Personal Information
```
@workspace What is my name according to the digital twin MCP server?
```

### Work Experience
```
@workspace Query the digital twin: What is my most recent work experience?
```

### Technical Skills
```
@workspace Using my digital twin data, list my technical skills
```

### Projects
```
@workspace What projects have I worked on? Use the digital twin MCP server
```

### Career Goals
```
@workspace What are my short-term and long-term career goals?
```

### Interview Prep
```
@workspace Help me prepare for a technical interview using my digital twin data. What are my key achievements?
```

### Salary Information
```
@workspace What are my salary expectations according to the digital twin?
```

## Verification Checklist

- ✅ `.vscode/mcp.json` file exists
- ✅ Server running at `http://localhost:3000`
- ✅ MCP endpoint responds to ping: `POST /api/mcp`
- ✅ Vector database has 207 vectors loaded
- ✅ Environment variables configured (`.env.local`)
- ⏭️ MCP enabled in VS Code Insiders
- ⏭️ Test prompts with GitHub Copilot

## Direct API Testing

```bash
# Test ping
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'

# Test query
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"query","params":{"question":"What are my skills?"},"id":2}'
```

## Troubleshooting

### If Copilot doesn't use MCP:
1. Restart VS Code Insiders
2. Check `.vscode/mcp.json` is valid JSON
3. Ensure server is running (`pnpm dev`)
4. Use `@workspace` prefix in prompts

### If server doesn't respond:
1. Check server logs in terminal
2. Verify `.env.local` has correct API keys
3. Test with `curl` commands above

## Files Reference

- **MCP Config**: `.vscode/mcp.json`
- **Server Endpoint**: `app/api/mcp/route.ts`
- **Profile Data**: `digitaltwin.json`
- **Environment**: `.env.local`
- **Testing Guide**: `MCP_TESTING.md`

---

**Ready to use!** Start asking GitHub Copilot questions about your digital twin. 🎉
