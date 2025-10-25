# Digital Twin MCP Server

An MCP (Model Context Protocol) server that provides AI-powered access to your professional profile using RAG (Retrieval-Augmented Generation).

## Features

The MCP server provides 5 powerful tools:

### 1. `query_digital_twin`

Ask any question about the professional profile. Returns AI-generated responses based on actual profile data.

**Example:**

```
"Tell me about your experience with React and Next.js"
"What are your career goals?"
"Describe your most impactful project"
```

### 2. `get_technical_skills`

Get a comprehensive list of all technical skills including frontend, backend, databases, cloud/devops, and UI/UX tools.

### 3. `get_work_experience`

Get detailed work experience including companies, roles, duration, achievements, and technologies used. Optionally filter by company name.

### 4. `get_projects`

Get portfolio projects with descriptions, technologies, and impact metrics.

### 5. `analyze_job_fit`

Analyze how well the profile matches a job description. Provides:

- Matching skills and experience
- Gaps or areas for development
- Relevant projects or achievements
- Overall fit score (1-10)
- Recommendations for standing out

## Setup

### 1. Install Dependencies

```bash
cd /Users/diwanmalla/Desktop/digital-twin-worshop
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Make sure your `.env` file has:

```env
UPSTASH_VECTOR_REST_URL=your_url_here
UPSTASH_VECTOR_REST_TOKEN=your_token_here
GROQ_API_KEY=your_key_here
```

### 3. Configure Claude Desktop

Edit `claude_desktop_config.json` with your actual environment variables, then copy it to:

**macOS:**

```bash
~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**

```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**

```
~/.config/Claude/claude_desktop_config.json
```

Or use this command on macOS:

```bash
mkdir -p ~/Library/Application\ Support/Claude/
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 4. Test the Server

Run the server directly to test:

```bash
python src/digital_twin_mcp_server.py
```

### 5. Restart Claude Desktop

After configuring, restart Claude Desktop to load the MCP server.

## Usage in Claude Desktop

Once configured, you can use the tools in Claude:

```
Can you query my digital twin about my React experience?

Can you analyze how well my profile fits this job description: [paste job description]

Show me my work experience at Barnamala Tech

What projects have I built?
```

## Architecture

```
┌─────────────────┐
│ Claude Desktop  │
└────────┬────────┘
         │ MCP Protocol
┌────────▼────────┐
│  MCP Server     │
│  (Python)       │
└────┬──────┬─────┘
     │      │
     │      └──────────┐
     │                 │
┌────▼────┐    ┌──────▼──────┐
│ Upstash │    │    Groq     │
│ Vector  │    │   (LLM)     │
│  (RAG)  │    │             │
└─────────┘    └─────────────┘
```

## Technologies

- **MCP SDK**: For Claude Desktop integration
- **Upstash Vector**: Vector database with built-in embeddings
- **Groq**: Ultra-fast LLM inference
- **Python**: Server implementation

## Next Steps

1. ✅ MCP Server with multiple tools (DONE)
2. 🔄 Add GitHub integration to auto-sync profile
3. 🔄 Create web UI for testing
4. 🔄 Add voice interaction
5. 🔄 Implement job posting analysis features
