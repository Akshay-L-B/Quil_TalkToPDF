import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";
import prisma from "@/db";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { index } from "@/lib/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

// To send the message to the server, we need to create an API route that will accept the message and the fileId as input and message as the input body. The API route will then add the message to the chat and return the message back to the client. The client will then display the message in the chat window.
export const POST = async (req: NextRequest) => {
  // Get the message and fileId from the request body
  const body = await req.json();

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileId, message } = SendMessageValidator.parse(body);

  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
      userId: user.id,
    },
  });

  if (!file) {
    return new Response("File not found", { status: 404 });
  }

  // if the file is found, add the message to the database
  const res = await prisma.message.create({
    data: {
      userId: user.id,
      fileId,
      isUserMessage: true,
      text: message,
    },
  });

  if (!res) {
    return new Response("Failed to add message", { status: 500 });
  }

  // To do a query using this message, we need to vectorize the message and query the Pinecone index
  // We embed the message using the same embeddings as the documents.
  const googleApiKey = process.env.GOOGLE_API_KEY;

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: googleApiKey,
    modelName: "embedding-001",
  });

  const messageEmbedding = await embeddings.embedQuery(message);

  // Query the Pinecone index to find similar documents to the message
  const queryResults = await index.query({
    vector: messageEmbedding,
    topK: 5,
    includeMetadata: true,
    filter: { fileId: { $eq: fileId } },
  });

  // along with this, we also take the previous messages to understand the context of the message better and provide a better response
  const prevMessages = await prisma.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  // Format the messages to be sent back to the client
  const formattedMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));
};
