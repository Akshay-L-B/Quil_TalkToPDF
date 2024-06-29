import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { privateProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import prisma from "@/db";
import { z } from "zod";

// Here comes all the api routes logic
export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    // check if the user is logged in
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.id || !user.email) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User is not logged in",
      });
    }

    //now check if the user is in the database

    const userInDatabase = prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!userInDatabase) {
      try {
        console.log("User not found in the database");
        const res = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
          },
        });

        console.log("New user created in the database");
        console.log(res);
      } catch (error) {
        console.error("Error creating new user in the database", error);
        return { success: false };
      }
    }

    console.log(userInDatabase);
    //if true, return success
    return { success: true };
  }),

  //Get user files
  getUserFiles: privateProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User is not logged in",
      });
    }
    const { userId } = ctx;

    const files = await prisma.file.findMany({
      where: {
        userId: userId,
      },
    });

    return files;
  }),

  getFile: privateProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { key } = input;
      const { userId } = ctx;

      const file = await prisma.file.findFirst({
        where: {
          key,
          userId,
        },
      });

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return file;
    }),

  // mutation is used for api calls like post, put, delete which changes the state of the server
  // get the input that is validated by zod into the mutation function
  deleteFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      //delete the file
      const { userId } = ctx;

      // get the file id from the input
      const { id } = input;

      // check if the file exists and that the user is the owner of the file
      const file = await prisma.file.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      // delete the file
      const deletedFile = await prisma.file.delete({
        where: {
          id,
        },
      });

      return deletedFile;
    }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
