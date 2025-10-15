# Testing LLM-Enhanced RAG System

## Overview
Your digital twin MCP server now has three query modes:

1. **Basic RAG** - Simple vector search + AI generation
2. **Enhanced RAG** - LLM-powered query preprocessing + interview-focused responses
3. **Comparison Mode** - Side-by-side A/B testing

## Test Commands

### Test in Terminal (Local Development)

```bash
# Start the development server
pnpm dev

# In another terminal, test the enhanced system:

# Test Enhanced RAG (default)
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "query_enhanced",
    "params": {"question": "What are my key technical strengths for a senior developer interview?"},
    "id": 1
  }'

# Test Basic RAG
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "query_basic",
    "params": {"question": "What are my technical skills?"},
    "id": 2
  }'

# Test Comparison Mode
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compare",
    "params": {"question": "Tell me about your best project"},
    "id": 3
  }'
```

### Test in VS Code Insiders with GitHub Copilot

Use your `.vscode/mcp.json` configuration, then ask:

```
@workspace Using my digital twin MCP server, answer this interview question with enhanced RAG: "What's your biggest professional achievement and how did it demonstrate your leadership skills?"
```

Compare basic vs enhanced:
```
@workspace Compare basic and enhanced RAG responses for: "Why should we hire you for this senior React developer position?"
```

## Test Scenarios for Interview Preparation

### 1. Technical Interview Questions

**Basic Question:**
```json
{
  "jsonrpc": "2.0",
  "method": "query_enhanced",
  "params": {"question": "What are your React and Next.js skills?"},
  "id": 1
}
```

**Expected Enhancement:**
- Original: "What are your React and Next.js skills?"
- Enhanced: "React expertise Next.js experience technical proficiency frameworks libraries performance optimization component architecture state management production projects years of experience"
- Response: Structured with STAR format, specific metrics, project examples

### 2. Behavioral Interview Questions

**Question:**
```json
{
  "jsonrpc": "2.0",
  "method": "query_enhanced",
  "params": {"question": "Tell me about a time you led a team through a challenging project"},
  "id": 2
}
```

**Expected Response:**
- Situation: BrainiX project context
- Task: Lead 3-member team, integrate AI features
- Action: Specific technical decisions and leadership approaches
- Result: 300% engagement increase, 94.7% completion rate

### 3. Culture Fit Questions

**Question:**
```json
{
  "jsonrpc": "2.0",
  "method": "query_enhanced",
  "params": {"question": "How do you handle learning new technologies?"},
  "id": 3
}
```

**Expected Response:**
- Concrete examples (Next.js in 2 weeks, RAG in 3 weeks)
- Learning methodology
- Adaptability evidence
- Confidence-building language

### 4. Salary & Experience Questions

**Question:**
```json
{
  "jsonrpc": "2.0",
  "method": "query_enhanced",
  "params": {"question": "What are your salary expectations and what level role are you targeting?"},
  "id": 4
}
```

**Expected Response:**
- Clear mid-level positioning
- Salary ranges with flexibility
- Experience level clarification
- Growth trajectory

## Performance Metrics to Monitor

The enhanced system returns metrics:

```javascript
{
  "metrics": {
    "queryEnhancementTime": 850,      // Time to enhance query with LLM
    "vectorSearchTime": 120,          // Time for vector search
    "responseFormattingTime": 1200,   // Time to format for interview
    "totalTime": 2170,                // Total processing time
    "enhancedQuery": "...",           // The enhanced search query
    "resultsFound": 5                 // Number of relevant chunks
  }
}
```

**Target Performance:**
- ✅ Query Enhancement: < 1000ms
- ✅ Vector Search: < 200ms
- ✅ Response Formatting: < 1500ms
- ✅ Total Time: < 3000ms

## Comparison Testing

Use the comparison mode to see improvements:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "compare",
    "params": {"question": "What makes you a strong candidate?"},
    "id": 1
  }'
```

**Evaluation Criteria:**
- Response specificity and detail
- Interview relevance and presentation
- Use of concrete examples and metrics
- Natural flow and confidence building
- STAR format application
- Processing time

## Expected Improvements

### Before (Basic RAG):
```
Q: "What are your key strengths?"
A: "My key strengths include React, Next.js, TypeScript, and Node.js. I have experience with AWS and CI/CD."
```

### After (Enhanced RAG):
```
Q: "What are your key strengths?"
A: "My core strengths lie in the React/Next.js ecosystem where I'm a proven expert. Specifically, I've delivered production applications that serve 10,000+ users with 40% performance improvements. For example, at Hamro Chautari, I led the optimization that reduced load times from 3s to 0.5s while improving our Lighthouse score from 65 to 92. I'm particularly strong in translating business requirements into scalable technical solutions – like when I automated deployment processes, eliminating 95% of deployment bugs and enabling 3x deployment frequency. My leadership experience includes mentoring 2 junior developers and leading the 3-person team that built BrainiX, achieving 94.7% course completion rates through thoughtful UX and AI integration."
```

## Troubleshooting

### If Enhanced RAG Fails
- Automatically falls back to basic RAG
- Check Groq API key in environment variables
- Monitor console logs for LLM errors
- Verify network connectivity

### If Responses Lack Detail
- Check if vector database has content
- Verify `digitaltwin.json` has detailed content_chunks
- Try more specific questions
- Test with comparison mode to diagnose

### If Performance is Slow
- LLM calls take 800-1500ms (expected)
- Total time should be under 3 seconds
- Consider caching for repeated questions
- Check Groq API rate limits

## Next Steps

1. **Test Locally**: Run `pnpm dev` and test all three modes
2. **Deploy to Vercel**: Push changes and let Vercel auto-deploy
3. **Update VS Code Config**: Use the Vercel URL in `.vscode/mcp.json`
4. **Practice Interviews**: Use enhanced RAG for real interview prep
5. **Monitor Metrics**: Track performance and quality improvements

## Advanced Testing

Test with different interview types (future enhancement):

```javascript
// Technical interview context
{
  "method": "query_enhanced",
  "params": {
    "question": "Explain your system architecture decisions",
    "interviewType": "technical_interview"
  }
}

// Behavioral interview context
{
  "method": "query_enhanced",
  "params": {
    "question": "Describe how you handle team conflicts",
    "interviewType": "behavioral_interview"
  }
}
```

Happy testing! 🚀
