import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { index } from "./pinecone";

export async function queryPinecone(
  query: string,
  fileId: string,
  topK: number = 5
) {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    modelName: "embedding-001",
  });

  const queryEmbedding = await embeddings.embedQuery(query);

  const queryResponse = await index.namespace(fileId).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  console.log("Query response:", JSON.stringify(queryResponse, null, 2));

  return queryResponse.matches.map((match) => ({
    score: match.score,
    pageNumber: match.metadata!.pageNumber,
    text: match.metadata!.text,
  }));
}
