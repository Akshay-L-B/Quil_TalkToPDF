import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import prisma from "@/db";

import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { index } from "@/lib/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

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

        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey: googleApiKey,
          modelName: "embedding-001",
        });

        const vectors = await Promise.all(
          pageLevelDocs.map(async (doc, i) => {
            const embedding = await embeddings.embedQuery(doc.pageContent);
            return {
              id: `${createdFile.id}-${i}`,
              values: embedding,
              metadata: {
                text: doc.pageContent,
                pageNumber: i + 1,
                fileId: createdFile.id,
              },
            };
          })
        );

        await index.namespace(createdFile.id).upsert(vectors);

        const stats = await index.describeIndexStats();
        console.log("Index stats:", stats);

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
