import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import prisma from "@/db";

import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { index } from "@/lib/pinecone";
// import { vectorizeDocuments } from "@/lib/vectorizerClient";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { cleanText } from "@/lib/cleanText";

const f = createUploadthing();
const googleApiKey = process.env.GOOGLE_API_KEY;

export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async () => {
      const { getUser } = getKindeServerSession();
      const user = await getUser();

      if (!user || !user.id) {
        throw new UploadThingError("Unauthorised");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // we get the file uploaded here
      // Save the file to the database

      const createdFile = await prisma.file.create({
        data: {
          userId: metadata.userId,
          key: file.key,
          name: file.name,
          url: file.url,
          uploadStatus: "PROCESSING",
        },
      });

      console.log("File created in the database", createdFile);

      try {
        const response = await fetch(file.url);
        const blob = await response.blob();

        const loader = new PDFLoader(blob);

        const pageLevelDocs = await loader.load();
        const pagesAmt = pageLevelDocs.length;
        const texts = pageLevelDocs.map((doc) => doc.pageContent);
        const cleanedTexts = texts.map((text) => cleanText(text));
        // const cleanedText = cleanText(texts.join(" ")); // Clean the text
        // const textChunks = cleanedText.split(/(.{1,512})/).filter(Boolean); // Split the text into chunks of 512 characters

        // Vectorize the pages using the Python TF-IDF server
        // const vectors = await vectorizeDocuments(texts);
        // console.log("Vectors", vectors);

        // vectorise the pages
        // const embeddings = new OpenAIEmbeddings({
        //   openAIApiKey: process.env.OPENAI_API_KEY,
        // });

        // await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
        //   pineconeIndex,
        //   namespace: createdFile.id,
        // });

        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey: googleApiKey,
          modelName: "embedding-001",
        });

        const dataToUpsert = cleanedTexts.map(async (eachPageDoc, index) => ({
          id: `${createdFile.id}-${index}`,
          values: await embeddings.embedQuery(eachPageDoc),
        }));

        await index
          .namespace(createdFile.id)
          .upsert(await Promise.all(dataToUpsert));

        await prisma.file.update({
          data: { uploadStatus: "SUCCESS" },
          where: { id: createdFile.id },
        });
      } catch (error) {
        console.error("Error processing the file", error);
        await prisma.file.update({
          data: { uploadStatus: "FAILED" },
          where: { id: createdFile.id },
        });
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
