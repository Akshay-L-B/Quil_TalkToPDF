import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const index = pc.Index(process.env.PINECONE_INDEX!);