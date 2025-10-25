#!/usr/bin/env python3
"""
Digital Twin MCP Server
An MCP server that provides AI-powered professional profile queries using RAG
"""

import asyncio
import os
import json
from typing import Any
from dotenv import load_dotenv
from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server import NotificationOptions, Server
import mcp.server.stdio
from upstash_vector import Index
from groq import Groq

# Load environment variables
load_dotenv()

# Initialize clients
vector_index = Index(
    url=os.getenv("UPSTASH_VECTOR_REST_URL"),
    token=os.getenv("UPSTASH_VECTOR_REST_TOKEN")
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Create server instance
server = Server("digital-twin")

# Constants
DEFAULT_MODEL = "llama-3.1-8b-instant"
PROFILE_NAME = "Diwan Malla"


def query_vector_db(query: str, top_k: int = 3) -> list[dict[str, Any]]:
    """Query Upstash Vector database for relevant profile information"""
    try:
        results = vector_index.query(
            data=query,
            top_k=top_k,
            include_metadata=True
        )
        return results
    except Exception as e:
        print(f"Error querying vector database: {e}")
        return []


def generate_response(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Generate response using Groq"""
    try:
        completion = groq_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": """You are Diwan Malla. Answer in first person naturally.

RULES:
- "what is your name?" → "My name is Diwan Malla."
- "who are you?" → 2-3 sentences: name, current role (Full-Stack Developer), location (Sydney, Australia), key expertise
- Simple questions → Simple answers (1-2 sentences)
- Complex questions → Detailed answers with examples, numbers, achievements
- Always speak as "I" (you ARE Diwan Malla)

Match the question's detail level - don't over-explain simple questions."""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=800
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"Error generating response: {e}"


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools"""
    return [
        types.Tool(
            name="query_digital_twin",
            description="Query the digital twin about Diwan Malla's professional background, skills, experience, projects, or career goals. Returns AI-generated responses based on the actual profile data.",
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The question to ask about the person's professional profile"
                    }
                },
                "required": ["question"]
            }
        ),
        types.Tool(
            name="get_technical_skills",
            description="Get a comprehensive list of technical skills including frontend, backend, databases, cloud/devops, and UI/UX tools",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        types.Tool(
            name="get_work_experience",
            description="Get detailed work experience including companies, roles, duration, achievements, and technologies used",
            inputSchema={
                "type": "object",
                "properties": {
                    "company": {
                        "type": "string",
                        "description": "Optional: Filter by specific company name"
                    }
                }
            }
        ),
        types.Tool(
            name="get_projects",
            description="Get portfolio projects with descriptions, technologies, and impact metrics",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        types.Tool(
            name="analyze_job_fit",
            description="Analyze how well the profile matches a job description. Provide a job description and get a detailed fit analysis.",
            inputSchema={
                "type": "object",
                "properties": {
                    "job_description": {
                        "type": "string",
                        "description": "The job description to analyze against the profile"
                    }
                },
                "required": ["job_description"]
            }
        )
    ]


@server.call_tool()
async def handle_call_tool(
    name: str,
    arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution"""
    
    if name == "query_digital_twin":
        question = arguments.get("question", "") if arguments else ""
        
        if not question:
            return [types.TextContent(
                type="text",
                text="Please provide a question to ask the digital twin."
            )]
        
        # Query vector database
        results = query_vector_db(question, top_k=3)
        
        if not results:
            return [types.TextContent(
                type="text",
                text="I don't have specific information about that topic in my profile."
            )]
        
        # Extract relevant context
        context_parts = []
        for result in results:
            metadata = result.metadata or {}
            title = metadata.get('title', 'Information')
            content = metadata.get('content', '')
            if content:
                context_parts.append(f"{title}: {content}")
        
        context = "\n\n".join(context_parts)
        
        # Generate response
        prompt = f"""Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
{context}

Question: {question}

Provide a helpful, professional response:"""
        
        response = generate_response(prompt)
        
        return [types.TextContent(
            type="text",
            text=response
        )]
    
    elif name == "get_technical_skills":
        # Query for skills
        results = query_vector_db("technical skills programming languages frameworks", top_k=2)
        
        skills_data = []
        for result in results:
            metadata = result.metadata or {}
            content = metadata.get('content', '')
            if content:
                skills_data.append(content)
        
        skills_text = "\n\n".join(skills_data) if skills_data else "Skills information not found"
        
        return [types.TextContent(
            type="text",
            text=f"**Technical Skills:**\n\n{skills_text}"
        )]
    
    elif name == "get_work_experience":
        company_filter = arguments.get("company", "") if arguments else ""
        
        query = f"work experience {company_filter}" if company_filter else "work experience employment history"
        results = query_vector_db(query, top_k=4)
        
        experience_parts = []
        for result in results:
            metadata = result.metadata or {}
            if metadata.get('type') == 'experience':
                title = metadata.get('title', '')
                content = metadata.get('content', '')
                if content:
                    experience_parts.append(f"**{title}**\n{content}")
        
        experience_text = "\n\n".join(experience_parts) if experience_parts else "Experience information not found"
        
        return [types.TextContent(
            type="text",
            text=f"**Work Experience:**\n\n{experience_text}"
        )]
    
    elif name == "get_projects":
        results = query_vector_db("projects portfolio applications built", top_k=4)
        
        project_parts = []
        for result in results:
            metadata = result.metadata or {}
            if metadata.get('type') == 'project' or 'project' in metadata.get('category', '').lower():
                title = metadata.get('title', '')
                content = metadata.get('content', '')
                if content:
                    project_parts.append(f"**{title}**\n{content}")
        
        projects_text = "\n\n".join(project_parts) if project_parts else "Project information not found"
        
        return [types.TextContent(
            type="text",
            text=f"**Portfolio Projects:**\n\n{projects_text}"
        )]
    
    elif name == "analyze_job_fit":
        job_description = arguments.get("job_description", "") if arguments else ""
        
        if not job_description:
            return [types.TextContent(
                type="text",
                text="Please provide a job description to analyze."
            )]
        
        # Query for relevant skills and experience
        results = query_vector_db(f"skills experience {job_description[:200]}", top_k=5)
        
        context_parts = []
        for result in results:
            metadata = result.metadata or {}
            content = metadata.get('content', '')
            if content:
                context_parts.append(content)
        
        context = "\n".join(context_parts)
        
        # Generate fit analysis
        prompt = f"""Analyze how well this professional profile matches the job description.

Profile Information:
{context}

Job Description:
{job_description}

Provide a detailed analysis covering:
1. Matching skills and experience
2. Gaps or areas for development
3. Relevant projects or achievements
4. Overall fit score (1-10)
5. Recommendations for standing out

Analysis:"""
        
        analysis = generate_response(prompt, model="llama-3.1-70b-versatile")
        
        return [types.TextContent(
            type="text",
            text=analysis
        )]
    
    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    """Run the MCP server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="digital-twin",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
