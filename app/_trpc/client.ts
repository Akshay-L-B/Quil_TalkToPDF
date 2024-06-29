import { AppRouter } from "@/trpc";
import { createTRPCReact } from "@trpc/react-query";

// Pass the type of the main router as a generic argument
// This helps with type inference in your components for fetching logics
export const trpc = createTRPCReact<AppRouter>({});
