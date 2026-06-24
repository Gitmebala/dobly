import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { upsertMemoryVector, deleteMemoryVector, upsertBatchMemoryVectors, deleteBatchMemoryVectors } from "./vectors";
import type { BusinessMemoryItem } from "@/lib/business-memory";

/**
 * Sync a single memory item to Pinecone
 * Call this when a memory item is created or updated
 */
export async function syncMemoryToPinecone(memoryId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  
  const { data: memoryItem, error } = await admin
    .from("memory_items")
    .select("*")
    .eq("id", memoryId)
    .single();

  if (error || !memoryItem) {
    console.error(`Failed to fetch memory item ${memoryId}:`, error);
    return;
  }

  await upsertMemoryVector(memoryItem as BusinessMemoryItem);
}

/**
 * Remove a memory item from Pinecone
 * Call this when a memory item is deleted
 */
export async function removeMemoryFromPinecone(memoryId: string): Promise<void> {
  await deleteMemoryVector(memoryId);
}

/**
 * Sync all memory items for a user to Pinecone
 * Useful for initial sync or bulk updates
 */
export async function syncUserMemoriesToPinecone(userId: string): Promise<{
  synced: number;
  failed: number;
}> {
  const admin = createAdminSupabaseClient();
  
  const { data: memoryItems, error } = await admin
    .from("memory_items")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(`Failed to fetch memory items for user ${userId}:`, error);
    return { synced: 0, failed: 0 };
  }

  if (!memoryItems || memoryItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

  try {
    await upsertBatchMemoryVectors(memoryItems as BusinessMemoryItem[]);
    return { synced: memoryItems.length, failed: 0 };
  } catch (error) {
    console.error(`Failed to sync memories for user ${userId}:`, error);
    return { synced: 0, failed: memoryItems.length };
  }
}

/**
 * Sync all memory items for a workspace to Pinecone
 */
export async function syncWorkspaceMemoriesToPinecone(workspaceId: string): Promise<{
  synced: number;
  failed: number;
}> {
  const admin = createAdminSupabaseClient();
  
  const { data: memoryItems, error } = await admin
    .from("memory_items")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error(`Failed to fetch memory items for workspace ${workspaceId}:`, error);
    return { synced: 0, failed: 0 };
  }

  if (!memoryItems || memoryItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

  try {
    await upsertBatchMemoryVectors(memoryItems as BusinessMemoryItem[]);
    return { synced: memoryItems.length, failed: 0 };
  } catch (error) {
    console.error(`Failed to sync memories for workspace ${workspaceId}:`, error);
    return { synced: 0, failed: memoryItems.length };
  }
}

/**
 * Rebuild Pinecone index for a user
 * Deletes all user's vectors and re-syncs from Supabase
 */
export async function rebuildUserPineconeIndex(userId: string): Promise<{
  deleted: number;
  synced: number;
  failed: number;
}> {
  const admin = createAdminSupabaseClient();
  
  // First, get all memory IDs for the user
  const { data: memoryItems, error } = await admin
    .from("memory_items")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    console.error(`Failed to fetch memory IDs for user ${userId}:`, error);
    return { deleted: 0, synced: 0, failed: 0 };
  }

  if (!memoryItems || memoryItems.length === 0) {
    return { deleted: 0, synced: 0, failed: 0 };
  }

  const memoryIds = memoryItems.map((item) => item.id);

  // Delete all vectors
  try {
    await deleteBatchMemoryVectors(memoryIds);
  } catch (error) {
    console.error(`Failed to delete vectors for user ${userId}:`, error);
  }

  // Re-sync all memories
  const { data: fullMemoryItems } = await admin
    .from("memory_items")
    .select("*")
    .eq("user_id", userId);

  if (!fullMemoryItems || fullMemoryItems.length === 0) {
    return { deleted: memoryIds.length, synced: 0, failed: 0 };
  }

  try {
    await upsertBatchMemoryVectors(fullMemoryItems as BusinessMemoryItem[]);
    return { deleted: memoryIds.length, synced: fullMemoryItems.length, failed: 0 };
  } catch (error) {
    console.error(`Failed to re-sync memories for user ${userId}:`, error);
    return { deleted: memoryIds.length, synced: 0, failed: fullMemoryItems.length };
  }
}
