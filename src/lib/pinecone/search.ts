import { getPineconeIndex } from "./client";
import { generateEmbedding } from "./embeddings";

export interface SearchResult {
  id: string;
  score: number;
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

export interface SearchOptions {
  topK?: number;
  filter?: {
    user_id?: string;
    workspace_id?: string;
    kind?: string;
    scope?: string;
  };
  includeMetadata?: boolean;
}

/**
 * Perform semantic search on memory vectors
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const index = getPineconeIndex();
  const {
    topK = 10,
    filter = {},
    includeMetadata = true,
  } = options;

  // Generate embedding for the query
  const { embedding } = await generateEmbedding(query);

  // Build filter for Pinecone
  const pineconeFilter: Record<string, unknown> = {};
  if (filter.user_id) pineconeFilter.user_id = { $eq: filter.user_id };
  if (filter.workspace_id) pineconeFilter.workspace_id = { $eq: filter.workspace_id };
  if (filter.kind) pineconeFilter.kind = { $eq: filter.kind };
  if (filter.scope) pineconeFilter.scope = { $eq: filter.scope };

  // Perform the search
  const queryResponse = await index.query({
    vector: embedding,
    topK,
    includeMetadata,
    includeValues: false,
    filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
  });

  const results: SearchResult[] = [];

  for (const match of queryResponse.matches || []) {
    if (match.id && match.score !== undefined && match.metadata) {
      results.push({
        id: match.id,
        score: match.score,
        metadata: match.metadata as SearchResult["metadata"],
      });
    }
  }

  return results;
}

/**
 * Hybrid search combining semantic and keyword-based filtering
 */
export async function hybridSearch(
  query: string,
  keywordFilter?: {
    titleContains?: string;
    bodyContains?: string;
    tagsInclude?: string[];
  },
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const semanticResults = await semanticSearch(query, options);

  if (!keywordFilter) {
    return semanticResults;
  }

  // Apply keyword filters on top of semantic results
  return semanticResults.filter((result) => {
    if (keywordFilter.titleContains) {
      if (!result.metadata.title.toLowerCase().includes(keywordFilter.titleContains.toLowerCase())) {
        return false;
      }
    }

    if (keywordFilter.bodyContains) {
      if (!result.metadata.body.toLowerCase().includes(keywordFilter.bodyContains.toLowerCase())) {
        return false;
      }
    }

    if (keywordFilter.tagsInclude && keywordFilter.tagsInclude.length > 0) {
      const hasAllTags = keywordFilter.tagsInclude.every((tag) =>
        result.metadata.tags.some((itemTag) => itemTag.toLowerCase() === tag.toLowerCase())
      );
      if (!hasAllTags) return false;
    }

    return true;
  });
}

/**
 * Find similar memories to a given memory item
 */
export async function findSimilarMemories(
  memoryId: string,
  options: { topK?: number; minScore?: number } = {}
): Promise<SearchResult[]> {
  const index = getPineconeIndex();
  const { topK = 5, minScore = 0.7 } = options;

  // Fetch the vector for the given memory
  const fetchResponse = await index.fetch([memoryId]);
  const vectorRecord = fetchResponse.records?.[memoryId];

  if (!vectorRecord || !vectorRecord.values) {
    return [];
  }

  // Query for similar vectors
  const queryResponse = await index.query({
    vector: vectorRecord.values,
    topK: topK + 1, // +1 to exclude the original
    includeMetadata: true,
    includeValues: false,
  });

  const results: SearchResult[] = [];

  for (const match of queryResponse.matches || []) {
    // Exclude the original memory
    if (match.id === memoryId) continue;
    
    if (match.id && match.score !== undefined && match.score >= minScore && match.metadata) {
      results.push({
        id: match.id,
        score: match.score,
        metadata: match.metadata as SearchResult["metadata"],
      });
    }
  }

  return results;
}
