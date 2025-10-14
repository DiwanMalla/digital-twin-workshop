"""
Digital Twin RAG Application
Based on Binal's production implementation
- Upstash Vector: Built-in embeddings and vector storage
- Groq: Ultra-fast LLM inference
"""

import os
import json
from dotenv import load_dotenv
from upstash_vector import Index
from groq import Groq

# Load environment variables
load_dotenv()

# Constants
JSON_FILE = "digitaltwin.json"
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
DEFAULT_MODEL = "llama-3.1-8b-instant"

def create_chunks_from_json(data, prefix="", parent_key=""):
    """Recursively create chunks from JSON data"""
    chunks = []
    
    for key, value in data.items():
        current_prefix = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        
        if isinstance(value, dict):
            # For nested objects, create a chunk for the object and recurse
            if parent_key:
                chunk_content = json.dumps(value, indent=2)
                chunks.append({
                    "id": current_prefix,
                    "title": f"{parent_key} - {key}",
                    "content": chunk_content,
                    "type": parent_key,
                    "metadata": {"category": parent_key, "subcategory": key}
                })
            chunks.extend(create_chunks_from_json(value, current_prefix, key))
        elif isinstance(value, list):
            # For lists, create chunks for each item
            for i, item in enumerate(value):
                item_id = f"{current_prefix}[{i}]"
                if isinstance(item, dict):
                    # Create a chunk for the dict item
                    item_content = json.dumps(item, indent=2)
                    title = f"{key} - {item.get('name', item.get('title', f'Item {i+1}'))}"
                    chunks.append({
                        "id": item_id,
                        "title": title,
                        "content": item_content,
                        "type": key,
                        "metadata": {"category": key, "index": i}
                    })
                    # Recurse into the item
                    chunks.extend(create_chunks_from_json(item, item_id, key))
                else:
                    # Simple list item
                    chunks.append({
                        "id": item_id,
                        "title": f"{key} {i+1}",
                        "content": str(item),
                        "type": key,
                        "metadata": {"category": key, "index": i}
                    })
        else:
            # Simple value
            chunks.append({
                "id": current_prefix,
                "title": key.replace('_', ' ').title(),
                "content": str(value),
                "type": parent_key or "general",
                "metadata": {"category": parent_key or "general"}
            })
    
    return chunks

def setup_groq_client():
    """Setup Groq client"""
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found in .env file")
        return None
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq client initialized successfully!")
        return client
    except Exception as e:
        print(f"❌ Error initializing Groq client: {str(e)}")
        return None

def setup_vector_database():
    """Setup Upstash Vector database with built-in embeddings"""
    print("🔄 Setting up Upstash Vector database...")
    
    try:
        index = Index.from_env()
        print("✅ Connected to Upstash Vector successfully!")
        
        # Check current vector count
        try:
            info = index.info()
            current_count = getattr(info, 'vector_count', 0)
            print(f"📊 Current vectors in database: {current_count}")
        except:
            current_count = 0
        
        # Load data (always load to ensure all data is uploaded)
        if current_count == 0 or True:  # Force load for now
            print("📝 Loading your complete professional profile...")
            
            try:
                with open(JSON_FILE, "r", encoding="utf-8") as f:
                    profile_data = json.load(f)
            except FileNotFoundError:
                print(f"❌ {JSON_FILE} not found!")
                return None
            
            # Prepare vectors from all profile data
            # Remove content_chunks to avoid duplication since they are pre-structured
            profile_data_copy = profile_data.copy()
            profile_data_copy.pop('content_chunks', None)
            
            all_chunks = create_chunks_from_json(profile_data_copy)
            
            # Add back the pre-structured content_chunks
            content_chunks = profile_data.get('content_chunks', [])
            all_chunks.extend(content_chunks)
            
            print(f"📊 Generated {len(all_chunks)} total chunks ({len(all_chunks) - len(content_chunks)} from JSON + {len(content_chunks)} content_chunks)")
            
            vectors = []
            
            for chunk in all_chunks:
                enriched_text = f"{chunk['title']}: {chunk['content']}"
                
                vectors.append((
                    chunk['id'],
                    enriched_text,
                    {
                        "title": chunk['title'],
                        "type": chunk['type'],
                        "content": chunk['content'],
                        "category": chunk.get('metadata', {}).get('category', ''),
                        "tags": chunk.get('metadata', {}).get('tags', [])
                    }
                ))
            
            # Upload vectors
            index.upsert(vectors=vectors)
            print(f"✅ Successfully uploaded {len(vectors)} profile data chunks!")
        
        return index
        
    except Exception as e:
        print(f"❌ Error setting up database: {str(e)}")
        return None

def query_vectors(index, query_text, top_k=3):
    """Query Upstash Vector for similar vectors"""
    try:
        results = index.query(
            data=query_text,
            top_k=top_k,
            include_metadata=True
        )
        return results
    except Exception as e:
        print(f"❌ Error querying vectors: {str(e)}")
        return None

def generate_response_with_groq(client, prompt, model=DEFAULT_MODEL):
    """Generate response using Groq"""
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return completion.choices[0].message.content.strip()
        
    except Exception as e:
        return f"❌ Error generating response: {str(e)}"

def rag_query(index, groq_client, question):
    """Perform RAG query using Upstash Vector + Groq"""
    try:
        # Step 1: Query vector database
        results = query_vectors(index, question, top_k=3)
        
        if not results or len(results) == 0:
            return "I don't have specific information about that topic."
        
        # Step 2: Extract relevant content
        print("\n🧠 Searching your professional profile...\n")
        
        top_docs = []
        for result in results:
            metadata = result.metadata or {}
            title = metadata.get('title', 'Information')
            content = metadata.get('content', '')
            score = result.score
            
            print(f"🔹 Found: {title} (Relevance: {score:.3f})")
            if content:
                top_docs.append(f"{title}: {content}")
        
        if not top_docs:
            return "I found some information but couldn't extract details."
        
        print(f"⚡ Generating personalized response...\n")
        
        # Step 3: Generate response with context
        context = "\n\n".join(top_docs)
        prompt = f"""Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
{context}

Question: {question}

Provide a helpful, professional response:"""
        
        response = generate_response_with_groq(groq_client, prompt)
        return response
    
    except Exception as e:
        return f"❌ Error during query: {str(e)}"

def main():
    """Main application loop"""
    print("🤖 Your Digital Twin - AI Profile Assistant")
    print("=" * 50)
    print("🔗 Vector Storage: Upstash (built-in embeddings)")
    print(f"⚡ AI Inference: Groq ({DEFAULT_MODEL})")
    print("📋 Data Source: Your Professional Profile\n")
    
    # Setup clients
    groq_client = setup_groq_client()
    if not groq_client:
        return
    
    index = setup_vector_database()
    if not index:
        return
    
    print("✅ Your Digital Twin is ready!\n")
    
    # Interactive chat loop
    print("🤖 Chat with your AI Digital Twin!")
    print("Ask questions about your experience, skills, projects, or career goals.")
    print("Type 'exit' to quit.\n")
    
    print("💭 Try asking:")
    print("  - 'Tell me about your work experience'")
    print("  - 'What are your technical skills?'")
    print("  - 'Describe your career goals'")
    print()
    
    while True:
        question = input("You: ")
        if question.lower() in ["exit", "quit"]:
            print("👋 Thanks for chatting with your Digital Twin!")
            break
        
        if question.strip():
            answer = rag_query(index, groq_client, question)
            print(f"🤖 Digital Twin: {answer}\n")

if __name__ == "__main__":
    main()
