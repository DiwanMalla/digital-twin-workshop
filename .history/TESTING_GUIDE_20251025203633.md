# 🚀 Quick Testing & Deployment Guide

## ✅ STEP 1: Test Your MCP Server

Every time you make changes, test with:

```bash
cd /Users/diwanmalla/Desktop/digital-twin-worshop
source venv/bin/activate
python test_mcp_server.py
```

**What this tests:**
- ✅ Connection to Upstash Vector (your profile database)
- ✅ Connection to Groq (AI responses)
- ✅ All 5 MCP tools work correctly
- ✅ RAG search finds relevant information
- ✅ AI generates proper responses

**Expected output:**
```
✅ Upstash Vector: Connected (39 vectors)
✅ Groq: Connected
📊 Test Results: 5 passed, 0 failed
```

---

## 🎯 STEP 2: Deploy to Claude Desktop

### Option A: Automated Setup (Recommended)

```bash
./setup_mcp.sh
```

This will:
1. Check your environment
2. Install dependencies
3. Run all tests
4. Ask if you want to install to Claude Desktop
5. Backup existing config
6. Install the new config

### Option B: Manual Setup

```bash
# Copy config to Claude Desktop
mkdir -p ~/Library/Application\ Support/Claude/
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

---

## 🔄 STEP 3: Restart Claude Desktop

After installing the config:
1. **Quit Claude Desktop completely** (⌘Q)
2. **Reopen Claude Desktop**
3. The MCP server will load automatically

---

## 💬 STEP 4: Use Your Digital Twin in Claude

Try these prompts in Claude Desktop:

### Basic Queries
```
Can you query my digital twin about my experience with React and Next.js?

What are my technical skills?

Tell me about my work experience at Barnamala Tech.

Show me the projects I've built.
```

### Advanced Features
```
Get my technical skills from the digital twin.

Show my complete work experience.

Analyze how well my profile fits this job description:
[paste full job description here]
```

### Job Fit Analysis (Most Powerful!)
```
I found this job posting. Can you analyze how well I fit?

Full-Stack Developer
Requirements:
- 3+ years React/Next.js
- TypeScript experience
- AWS or Azure
- PostgreSQL/MongoDB
- CI/CD pipelines

Use the analyze_job_fit tool to give me a detailed breakdown.
```

---

## 🛠️ Troubleshooting

### "MCP server not found"
- Make sure Claude Desktop is completely restarted
- Check config is at: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Verify the paths in the config file are correct

### "Connection failed"
- Check your `.env` file has valid credentials
- Run `python test_mcp_server.py` to verify connections
- Make sure Upstash Vector has data (run the reload API)

### "No vectors found"
- Your Upstash database might be empty
- Start Next.js: `pnpm dev`
- Make DELETE request: `curl -X DELETE http://localhost:3000/api/mcp/reload`
- This uploads all your profile data

---

## 📊 Available MCP Tools

Your Claude can now use these 5 tools:

| Tool | Description | Example |
|------|-------------|---------|
| `query_digital_twin` | Ask anything about the profile | "Tell me about React experience" |
| `get_technical_skills` | List all technical skills | "What are my frontend skills?" |
| `get_work_experience` | Get work history | "Show my experience at Barnamala" |
| `get_projects` | Get portfolio projects | "What projects have I built?" |
| `analyze_job_fit` | Analyze job match | "How well do I fit [job description]?" |

---

## 🔄 Making Updates

When you update your profile or MCP server:

```bash
# 1. Test your changes
python test_mcp_server.py

# 2. If tests pass, restart Claude Desktop
# Just quit and reopen - config auto-reloads

# 3. If you changed the config file
./setup_mcp.sh
```

---

## 📈 Next Enhancements

After this works, we can add:
- ✨ GitHub integration (auto-sync repos)
- 🎨 Web UI for testing
- 🎤 Voice interaction
- 📊 Analytics dashboard
- 🔄 Real-time profile updates

**Ready to test?** Run:
```bash
python test_mcp_server.py
```
