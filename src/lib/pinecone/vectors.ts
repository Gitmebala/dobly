import { getPineconeIndex } from "./client";
import { generateEmbedding, generateBatchEmbeddings } from "./embeddings";
import type { BusinessMemoryItem } from "@/lib/business-memory";

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    user_id: string;
    workspace_id: string | null;
    kind: string;
    scope: string;
    title: string;
    body: string;
    tags: string[];
    confidence: number;
    created_at: string;
  };
}

/**
 * Upsert a single memory item to Pinecone
 */
export async function upsertMemoryVector(memoryItem: BusinessMemoryItem): Promise<void> {
  const index = getPineconeIndex();
  
  // Generate embedding from the memory item's searchable text
  const searchText = `${memoryItem.kind} ${memoryItem.scope} ${memoryItem.title} ${memoryItem.body} ${memoryItem.tags.join(" ")}`;
  const { embedding } = await generateEmbedding(searchText);
  
  const vectorRecord: VectorRecord = {
    id: memoryItem.id,
    values: embedding,
    metadata: {
      user_id: memoryItem.user_id,
      workspace_id: memoryItem.workspace_id,
      kind: memoryItem.kind,
      scope: memoryItem.scope,
      title: memoryItem.title,
      body: memoryItem.body,
      tags: memoryItem.tags,
      confidence: memoryItem.confidence,
      created_at: memoryItem.created_at,
    },
  };
  
  await index.upsert([vectorRecord]);
}

/**
 * Upsert multiple memory items in batch
 */
export async function upsertBatchMemoryVectors(memoryItems: BusinessMemoryItem[]): Promise<void> {
  if (memoryItems.length === 0) return;
  
  const index = getPineconeIndex();
  
  // Generate embeddings for all items
  const searchTexts = memoryItems.map(
    (item) => `${item.kind} ${item.scope} ${item.title} ${item.body} ${item.tags.join(" ")}`
  );
  const embeddingResults = await generateBatchEmbeddings(searchTexts);
  
  const vectorRecords: VectorRecord[] = memoryItems.map((item, index) => ({
    id: item.id,
    values: embeddingResults[index].embedding,
    metadata: {
      user_id: item.user_id,
      workspace_id: item.workspace_id,
      kind: item.kind,
      scope: item.scope,
      title: item.title,
      body: item.body,
      tags: item.tags,
      confidence: item.confidence,
      created_at: item.created_at,
    },
  }));
  
  await index.upsert(vectorRecords);
}

/**
 * Delete a vector from Pinecone
 */
export async function deleteMemoryVector(memoryId: string): Promise<void> {
  const index = getPineconeIndex();
  await index.deleteOne(memoryId);
}

/**
 * Delete multiple vectors in batch
 */
export async function deleteBatchMemoryVectors(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;
  
  const index = getPineconeIndex();
  await index.deleteMany(memoryIds);
}
