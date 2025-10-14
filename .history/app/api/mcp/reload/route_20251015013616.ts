import { NextRequest, NextResponse } from "next/server";
import { vectorIndex } from "@/lib/upstash";
import fs from "fs/promises";
import path from "path";

type ChunkType = {
  id: string;
  title: string;
  type: string;
  content: string;
  metadata?: { category?: string; tags?: string[] };
};

function createChunksFromJson(data: any, prefix: string = "", parentKey: string = ""): ChunkType[] {
  const chunks: ChunkType[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    const currentPrefix = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // For nested objects, create a chunk for the object and recurse
      if (parentKey) {
        const chunkContent = JSON.stringify(value, null, 2);
        chunks.push({
          id: currentPrefix,
          title: `${parentKey} - ${key}`,
          content: chunkContent,
          type: parentKey,
          metadata: { category: parentKey, subcategory: key }
        });
      }
      chunks.push(...createChunksFromJson(value as any, currentPrefix, key));
    } else if (Array.isArray(value)) {
      // For lists, create chunks for each item
      value.forEach((item, i) => {
        const itemId = `${currentPrefix}[${i}]`;
        if (typeof item === 'object' && item !== null) {
          // Create a chunk for the dict item
          const itemContent = JSON.stringify(item, null, 2);
          const title = `${key} - ${(item as any).name || (item as any).title || `Item ${i + 1}`}`;
          chunks.push({
            id: itemId,
            title,
            content: itemContent,
            type: key,
            metadata: { category: key, index: i }
          });
          // Recurse into the item
          chunks.push(...createChunksFromJson(item as any, itemId, key));
        } else {
          // Simple list item
          chunks.push({
            id: itemId,
            title: `${key} ${i + 1}`,
            content: String(item),
            type: key,
            metadata: { category: key, index: i }
          });
        }
      });
    } else {
      // Simple value
      chunks.push({
        id: currentPrefix,
        title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        content: String(value),
        type: parentKey || "general",
        metadata: { category: parentKey || "general" }
      });
    }
  }
  
  return chunks;
}
export async function DELETE() {
  const startTime = Date.now();
  
  try {
    console.log("[Reload] Starting database reset...");
    
    // Reset the index (delete all vectors)
    await vectorIndex.reset();
    console.log("[Reload] Database cleared successfully");
    
    // Load digitaltwin.json
    const jsonPath = path.join(process.cwd(), "digitaltwin.json");
    const fileContent = await fs.readFile(jsonPath, "utf-8");
    const profileData = JSON.parse(fileContent);
    
    // Generate chunks from all profile data
    const profileDataCopy = { ...profileData };
    delete profileDataCopy.content_chunks; // Remove to avoid duplication
    const allChunks = createChunksFromJson(profileDataCopy);
    
    // Add back the pre-structured content_chunks
    const contentChunks = profileData.content_chunks || [];
    allChunks.push(...contentChunks);

    console.log(`[Reload] Processing ${allChunks.length} total chunks (${allChunks.length - contentChunks.length} from JSON + ${contentChunks.length} content_chunks)...`);

    // Prepare vectors
    const vectors = allChunks.map((chunk) => {
      const enrichedText = `${chunk.title}: ${chunk.content}`;

      return {
        id: chunk.id,
        data: enrichedText,
        metadata: {
          title: chunk.title,
          type: chunk.type,
          content: chunk.content,
          category: chunk.metadata?.category || "",
          tags: chunk.metadata?.tags || [],
        },
      };
    });    // Upload vectors
    await vectorIndex.upsert(vectors);
    
    const duration = Date.now() - startTime;
    console.log(`[Reload] Successfully reloaded ${vectors.length} vectors in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Database reloaded with ${vectors.length} content chunks`,
      vectorCount: vectors.length,
      reloadTime: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Reload] Error after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : "Failed to reload database"
      },
      { status: 500 }
    );
  }
}
