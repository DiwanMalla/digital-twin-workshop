#!/usr/bin/env python3
"""
Digital Twin Data Embedding Script
Embeds all content chunks from digitaltwin.json into Upstash Vector Database
"""

# Essential imports for Digital Twin RAG System
import os
import json
from dotenv import load_dotenv
from upstash_vector import Index
import time

# Load environment variables
load_dotenv('.env.local')  # Load from .env.local instead of .env

def load_digital_twin_data(file_path='digitaltwin.json'):
    """Load digital twin data from JSON file"""
    print(f"[Load] Reading data from {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"[Load] Loaded data structure successfully")
    return data

def prepare_content_chunks(data):
    """Extract and prepare content chunks for embedding"""
    chunks = data.get('content_chunks', [])
    print(f"[Prepare] Found {len(chunks)} content chunks to embed")
    
    # Prepare data for Upstash Vector
    prepared_chunks = []
    for chunk in chunks:
        chunk_data = {
            'id': chunk['id'],
            'data': chunk['content'],  # The actual content to embed
            'metadata': {
                'title': chunk.get('title', ''),
                'type': chunk.get('type', ''),
                'content': chunk['content'],  # Store content in metadata for retrieval
                'category': chunk.get('metadata', {}).get('category', ''),
                'tags': chunk.get('metadata', {}).get('tags', [])
            }
        }
        prepared_chunks.append(chunk_data)
    
    return prepared_chunks

def embed_to_upstash(chunks):
    """Embed content chunks into Upstash Vector database"""
    
    # Validate environment variables
    url = os.getenv('UPSTASH_VECTOR_REST_URL')
    token = os.getenv('UPSTASH_VECTOR_REST_TOKEN')
    
    if not url or not token:
        raise ValueError("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set in .env.local")
    
    print(f"[Upstash] Connecting to vector database...")
    index = Index(url=url, token=token)
    
    print(f"[Upstash] Starting to upsert {len(chunks)} chunks...")
    
    # Batch upsert for efficiency
    BATCH_SIZE = 10
    total_chunks = len(chunks)
    successful = 0
    failed = 0
    
    for i in range(0, total_chunks, BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total_chunks + BATCH_SIZE - 1) // BATCH_SIZE
        
        try:
            print(f"[Upstash] Processing batch {batch_num}/{total_batches} ({len(batch)} items)...")
            
            # Upsert batch
            for chunk in batch:
                try:
                    index.upsert(
                        vectors=[{
                            'id': chunk['id'],
                            'data': chunk['data'],
                            'metadata': chunk['metadata']
                        }]
                    )
                    successful += 1
                    print(f"  ✓ Embedded: {chunk['id']} - {chunk['metadata']['title']}")
                except Exception as e:
                    failed += 1
                    print(f"  ✗ Failed: {chunk['id']} - {str(e)}")
            
            # Small delay between batches to avoid rate limits
            if i + BATCH_SIZE < total_chunks:
                time.sleep(0.5)
                
        except Exception as e:
            print(f"[Error] Batch {batch_num} failed: {str(e)}")
            failed += len(batch)
    
    print(f"\n[Complete] Embedding finished:")
    print(f"  ✓ Successful: {successful}/{total_chunks}")
    print(f"  ✗ Failed: {failed}/{total_chunks}")
    
    return successful, failed

def verify_embeddings(sample_ids):
    """Verify that embeddings were successfully created"""
    url = os.getenv('UPSTASH_VECTOR_REST_URL')
    token = os.getenv('UPSTASH_VECTOR_REST_TOKEN')
    
    print(f"\n[Verify] Checking sample embeddings...")
    index = Index(url=url, token=token)
    
    for chunk_id in sample_ids[:3]:  # Check first 3
        try:
            result = index.query(
                data=chunk_id,
                top_k=1,
                include_metadata=True
            )
            if result:
                print(f"  ✓ Found: {chunk_id}")
            else:
                print(f"  ✗ Not found: {chunk_id}")
        except Exception as e:
            print(f"  ✗ Error checking {chunk_id}: {str(e)}")

def main():
    """Main execution function"""
    print("=" * 60)
    print("Digital Twin Data Embedding Script")
    print("=" * 60)
    
    try:
        # Step 1: Load data
        data = load_digital_twin_data()
        
        # Step 2: Prepare chunks
        chunks = prepare_content_chunks(data)
        
        if not chunks:
            print("[Error] No content chunks found in digitaltwin.json")
            return
        
        # Step 3: Embed to Upstash
        successful, failed = embed_to_upstash(chunks)
        
        # Step 4: Verify (optional)
        if successful > 0:
            chunk_ids = [c['id'] for c in chunks]
            verify_embeddings(chunk_ids)
        
        print("\n" + "=" * 60)
        print("Embedding process completed!")
        print("=" * 60)
        
    except FileNotFoundError:
        print("[Error] digitaltwin.json not found in current directory")
    except json.JSONDecodeError:
        print("[Error] Invalid JSON format in digitaltwin.json")
    except Exception as e:
        print(f"[Error] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
