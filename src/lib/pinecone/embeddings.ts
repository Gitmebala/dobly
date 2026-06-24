import { anthropic } from "@/lib/anthropic";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  text: string;
}

/**
 * Generate embeddings using Anthropic's embedding API
 * Note: Anthropic doesn't have a public embedding API yet.
 * This is a placeholder that uses OpenAI embeddings as a fallback,
 * or you can switch to a different provider like Cohere or Voyage AI.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings. Anthropic does not currently provide an embedding API.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Embedding generation failed: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  return {
    embedding,
    model: "text-embedding-3-small",
    text,
  };
}

/**
 * Generate embeddings in batch for multiple texts
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Batch embedding generation failed: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return data.data.map((item: any, index: number) => ({
    embedding: item.embedding,
    model: "text-embedding-3-small",
    text: texts[index],
  }));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
