import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not configured");
  }

  pineconeClient = new Pinecone({
    apiKey,
  });

  return pineconeClient;
}

export function getPineconeIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX;
  
  if (!indexName) {
    throw new Error("PINECONE_INDEX is not configured");
  }

  return client.index(indexName);
}

export async function ensurePineconeIndexExists(): Promise<void> {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX;
  
  if (!indexName) {
    throw new Error("PINECONE_INDEX is not configured");
  }

  try {
    const indexes = await client.listIndexes();
    const exists = indexes.indexes?.some((idx) => idx.name === indexName);
    
    if (!exists) {
      throw new Error(
        `Pinecone index "${indexName}" does not exist. Please create it in the Pinecone console.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not exist")) {
      throw error;
    }
    console.warn("Could not verify Pinecone index existence:", error);
  }
}
