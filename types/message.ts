import { AppRouter } from "@/trpc";
import { inferRouterOutputs } from "@trpc/server";

type RouterOutput = inferRouterOutputs<AppRouter>;

type Messages = RouterOutput["getFileMessages"]["messages"];

// text is actually a jsx element as we have defined it in the component
// so we need to omit it from the type to get the correct type
// Messages[number] is the type of each message, else it would be an array of messages
type OmitText = Omit<Messages[number], "text">;

type ExtendedText = {
  text: string | JSX.Element;
};

export type ExtendedMessage = OmitText & ExtendedText;
