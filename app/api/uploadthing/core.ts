import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import prisma from "@/db";

const f = createUploadthing();

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

      const res = await prisma.file.create({
        data: {
          userId: metadata.userId,
          key: file.key,
          name: file.name,
          url: file.url,
          uploadStatus: "PROCESSING",
        },
      });
      return {};
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
