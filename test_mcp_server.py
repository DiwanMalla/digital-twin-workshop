#!/usr/bin/env python3
"""
Test script for Digital Twin MCP Server
Tests all available tools without needing Claude Desktop
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from digital_twin_mcp_server import (
    query_vector_db,
    generate_response,
    vector_index,
    groq_client
)

def test_connection():
    """Test connections to Upstash and Groq"""
    print("🔍 Testing Connections...")
    print("-" * 50)
    
    # Test Upstash
    try:
        info = vector_index.info()
        vector_count = getattr(info, 'vector_count', 0)
        print(f"✅ Upstash Vector: Connected ({vector_count} vectors)")
    except Exception as e:
        print(f"❌ Upstash Vector: Failed - {e}")
        return False
    
    # Test Groq
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Say 'OK'"}],
            max_tokens=10
        )
        print(f"✅ Groq: Connected")
    except Exception as e:
        print(f"❌ Groq: Failed - {e}")
        return False
    
    print()
    return True

def test_query_digital_twin():
    """Test the query_digital_twin tool"""
    print("🤖 Testing: query_digital_twin")
    print("-" * 50)
    
    question = "What are your main technical skills?"
    print(f"Question: {question}\n")
    
    # Query vector database
    results = query_vector_db(question, top_k=3)
    
    if not results:
        print("❌ No results from vector database")
        return False
    
    print(f"Found {len(results)} relevant chunks:")
    for i, result in enumerate(results, 1):
        metadata = result.metadata or {}
        title = metadata.get('title', 'Unknown')
        score = result.score
        print(f"  {i}. {title} (score: {score:.3f})")
    
    # Extract context
    context_parts = []
    for result in results:
        metadata = result.metadata or {}
        content = metadata.get('content', '')
        if content:
            context_parts.append(content[:100] + "...")
    
    context = "\n\n".join(context_parts)
    
    # Generate response
    prompt = f"""Based on the following information, answer the question.

Information:
{context}

Question: {question}

Answer:"""
    
    print("\n💭 Generating response...")
    response = generate_response(prompt)
    print(f"\n📝 Response:\n{response}\n")
    
    return True

def test_get_technical_skills():
    """Test getting technical skills"""
    print("⚙️ Testing: get_technical_skills")
    print("-" * 50)
    
    results = query_vector_db("technical skills programming languages frameworks", top_k=2)
    
    if not results:
        print("❌ No skills found")
        return False
    
    print(f"✅ Found {len(results)} skill-related chunks\n")
    
    for i, result in enumerate(results, 1):
        metadata = result.metadata or {}
        title = metadata.get('title', 'Unknown')
        content = metadata.get('content', '')
        print(f"{i}. {title}")
        print(f"   {content[:150]}...\n")
    
    return True

def test_get_work_experience():
    """Test getting work experience"""
    print("💼 Testing: get_work_experience")
    print("-" * 50)
    
    results = query_vector_db("work experience employment history", top_k=3)
    
    if not results:
        print("❌ No experience found")
        return False
    
    print(f"✅ Found {len(results)} experience-related chunks\n")
    
    for i, result in enumerate(results, 1):
        metadata = result.metadata or {}
        title = metadata.get('title', 'Unknown')
        result_type = metadata.get('type', 'Unknown')
        score = result.score
        print(f"{i}. {title} (type: {result_type}, score: {score:.3f})")
    
    print()
    return True

def test_get_projects():
    """Test getting projects"""
    print("🚀 Testing: get_projects")
    print("-" * 50)
    
    results = query_vector_db("projects portfolio applications built", top_k=4)
    
    if not results:
        print("❌ No projects found")
        return False
    
    print(f"✅ Found {len(results)} project-related chunks\n")
    
    for i, result in enumerate(results, 1):
        metadata = result.metadata or {}
        title = metadata.get('title', 'Unknown')
        category = metadata.get('category', 'Unknown')
        print(f"{i}. {title} (category: {category})")
    
    print()
    return True

def test_analyze_job_fit():
    """Test job fit analysis"""
    print("🎯 Testing: analyze_job_fit")
    print("-" * 50)
    
    job_description = """
    Full-Stack Developer position requiring:
    - 3+ years experience with React and Next.js
    - Strong TypeScript skills
    - Experience with cloud platforms (AWS/Azure)
    - PostgreSQL or MongoDB
    - CI/CD experience
    """
    
    print(f"Job Description:\n{job_description}\n")
    
    # Query for relevant information
    results = query_vector_db(f"skills experience React Next.js TypeScript AWS cloud", top_k=5)
    
    if not results:
        print("❌ No matching skills found")
        return False
    
    print(f"✅ Found {len(results)} matching skills/experiences")
    
    context_parts = []
    for result in results:
        metadata = result.metadata or {}
        content = metadata.get('content', '')
        if content:
            context_parts.append(content[:200])
    
    context = "\n".join(context_parts)
    
    prompt = f"""Analyze how well this profile matches the job description.

Profile Information:
{context}

Job Description:
{job_description}

Provide a brief analysis with:
1. Key matching skills
2. Overall fit score (1-10)

Analysis:"""
    
    print("\n💭 Generating job fit analysis...")
    analysis = generate_response(prompt)
    print(f"\n📊 Analysis:\n{analysis}\n")
    
    return True

def main():
    """Run all tests"""
    print("=" * 50)
    print("🧪 Digital Twin MCP Server Tests")
    print("=" * 50)
    print()
    
    # Test connection first
    if not test_connection():
        print("\n❌ Connection tests failed. Check your .env file.")
        return
    
    tests = [
        test_query_digital_twin,
        test_get_technical_skills,
        test_get_work_experience,
        test_get_projects,
        test_analyze_job_fit
    ]
    
    passed = 0
    failed = 0
    
    for test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test failed with error: {e}\n")
            failed += 1
    
    print("=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    print("=" * 50)
    
    if failed == 0:
        print("\n✅ All tests passed! Your MCP server is ready to use.")
        print("\n📋 Next steps:")
        print("1. Copy claude_desktop_config.json to Claude Desktop config folder")
        print("2. Restart Claude Desktop")
        print("3. Ask Claude to use your digital twin tools!")
    else:
        print("\n⚠️ Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()
