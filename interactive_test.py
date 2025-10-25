#!/usr/bin/env python3
"""
Interactive MCP Tool Tester
Test individual tools interactively
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from digital_twin_mcp_server import (
    query_vector_db,
    generate_response
)

def test_tool(tool_name: str, **kwargs):
    """Test a specific tool"""
    print(f"\n{'='*60}")
    print(f"Testing: {tool_name}")
    print('='*60)
    
    if tool_name == "query_digital_twin":
        question = kwargs.get('question', 'What are your skills?')
        print(f"Question: {question}\n")
        
        results = query_vector_db(question, top_k=3)
        
        if not results:
            print("❌ No results found")
            return
        
        print(f"✅ Found {len(results)} relevant chunks\n")
        
        context_parts = []
        for i, result in enumerate(results, 1):
            metadata = result.metadata or {}
            title = metadata.get('title', 'Unknown')
            content = metadata.get('content', '')
            score = result.score
            print(f"{i}. {title} (score: {score:.3f})")
            if content:
                context_parts.append(f"{title}: {content}")
        
        context = "\n\n".join(context_parts)
        
        prompt = f"""Based on this information, answer the question in first person.

Information:
{context}

Question: {question}

Answer:"""
        
        print("\n💭 Generating response...\n")
        response = generate_response(prompt)
        print(f"📝 Response:\n{response}\n")
    
    elif tool_name == "analyze_job_fit":
        job_desc = kwargs.get('job_description', '')
        if not job_desc:
            print("❌ Please provide a job description")
            return
        
        print(f"Job Description:\n{job_desc}\n")
        
        results = query_vector_db(f"skills experience {job_desc[:200]}", top_k=5)
        
        if not results:
            print("❌ No matching information found")
            return
        
        print(f"✅ Found {len(results)} relevant chunks\n")
        
        context_parts = []
        for result in results:
            metadata = result.metadata or {}
            content = metadata.get('content', '')
            if content:
                context_parts.append(content[:200])
        
        context = "\n".join(context_parts)
        
        prompt = f"""Analyze profile fit for this job.

Profile:
{context}

Job:
{job_desc}

Analysis (matching skills, gaps, fit score 1-10):"""
        
        print("💭 Generating analysis...\n")
        analysis = generate_response(prompt, model="llama-3.1-70b-versatile")
        print(f"📊 Analysis:\n{analysis}\n")

def main():
    """Interactive menu"""
    print("🎯 Interactive MCP Tool Tester")
    print("="*60)
    
    while True:
        print("\nAvailable tests:")
        print("1. Query Digital Twin (custom question)")
        print("2. Analyze Job Fit (paste job description)")
        print("3. Quick Skills Query")
        print("4. Quick Experience Query")
        print("5. Quick Projects Query")
        print("0. Exit")
        
        choice = input("\nSelect test (0-5): ").strip()
        
        if choice == "0":
            print("\n👋 Goodbye!")
            break
        
        elif choice == "1":
            question = input("\nEnter your question: ").strip()
            if question:
                test_tool("query_digital_twin", question=question)
        
        elif choice == "2":
            print("\nPaste job description (press Enter twice when done):")
            lines = []
            while True:
                line = input()
                if line == "":
                    break
                lines.append(line)
            job_desc = "\n".join(lines)
            if job_desc:
                test_tool("analyze_job_fit", job_description=job_desc)
        
        elif choice == "3":
            test_tool("query_digital_twin", question="What are your main technical skills?")
        
        elif choice == "4":
            test_tool("query_digital_twin", question="Describe your work experience")
        
        elif choice == "5":
            test_tool("query_digital_twin", question="What projects have you built?")
        
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()
