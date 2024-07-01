import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";
import { TRPCError, initTRPC } from "@trpc/server";

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create();

// To check if a user is authenticated and if yes then send the user context to the next middleware or the api
const middleware = t.middleware;

const isAuthenticated = middleware(async (opts) => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // if the user is not authenticated, then throw an error with the code UNAUTHORIZED to the client
  if (!user || !user.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return opts.next({
    // pass the user context to the next middleware or the api
    ctx: {
      userId: user.id,
      user,
    },
  });
});

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// any privateProcedure I call, it will first check if the user is authenticated by calling the isAuthenticated middleware
export const privateProcedure = t.procedure.use(isAuthenticated);
