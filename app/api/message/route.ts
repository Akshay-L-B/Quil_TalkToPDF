import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";
import prisma from "@/db";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryPinecone } from "@/lib/queryPinecone";
import { GoogleGenerativeAIStream, StreamingTextResponse } from "ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

const buildGoogleGenAIPrompt = (messages: any[]) => ({
  contents: messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.content }],
    })),
});

// To send the message to the server, we need to create an API route that will accept the message and the fileId as input and message as the input body. The API route will then add the message to the chat and return the message back to the client. The client will then display the message in the chat window.
export const POST = async (req: NextRequest) => {
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

  // Query the Pinecone index to find similar documents to the message
  const results = await queryPinecone(message, fileId, 5);
  console.log(results);

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
  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));

  // Send the messages back to the gen ai api
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Convert the prompt to the format required by the Google GenAI API
  const genAIPrompt = [
    {
      role: "user",
      content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.\n   
      You can answer if you know the exact answer even if it is not present in the context based on general knowledge\nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
    \n----------------\n
    
    **PREVIOUS CONVERSATION:**
${
  formattedPrevMessages.length > 0 &&
  formattedPrevMessages
    .map((message) => {
      if (message.role === "user") {
        return `*User:* ${message.content}\n`;
      } else {
        return `*Assistant:* ${message.content}\n`;
      }
    })
    .join("")
}

**------------------**

**CONTEXT:**
${results.map((r) => r.text).join("\n\n")}

**USER INPUT:** ${message}`,
    },
  ];

  console.log(genAIPrompt);

  // Send the query to the model

  const response = await model.generateContentStream(
    buildGoogleGenAIPrompt(genAIPrompt)
  );

  const stream = GoogleGenerativeAIStream(response, {
    async onCompletion(completion) {
      await prisma.message.create({
        data: {
          text: completion,
          isUserMessage: false,
          fileId,
          userId: user.id,
        },
      });
    },
  });

  return new StreamingTextResponse(stream);
};
