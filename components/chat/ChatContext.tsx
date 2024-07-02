import { createContext, useRef, useState } from "react";
import { useToast } from "../ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";

type ChatContextType = {
  addMessage: () => void;
  message: string;

  // This function will be used to update the message state and will receive an event as a parameter and triggered when the user types in the input.
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
};

// This is the context that will be used to pass the message
// and the function to add a message to the chat.

// A context is a way to share data between components without having to pass it down manually.

// The createContext function creates a context object that will be used to share the data.
// The createContext function receives an object with the default values of the context.
export const ChatContext = createContext<ChatContextType>({
  addMessage: () => {},
  message: "",
  handleInputChange: () => {},
  isLoading: false,
});

interface ChatContextProviderProps {
  fileId: string;
  children: React.ReactNode;
}

export const ChatContextProvider = ({
  fileId,
  children,
}: ChatContextProviderProps) => {
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const backupMessage = useRef("");
  const utils = trpc.useUtils();

  // here we are not using trpc because we want to stream back the messages from the api to the client in real-time.

  // trpc provides only json responses, so we can't use it to stream data back to the client.
  const { mutate: sendMessage } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      // here we will call the api to add a message to the chat

      const response = await fetch("/api/message", {
        method: "POST",
        body: JSON.stringify({ message, fileId }),
      });

      if (!response.ok) {
        throw new Error("Failed to add message");
      }

      return response.body;
    },

    onMutate: async ({ message }) => {
      backupMessage.current = message;
      setMessage("");

      // step 1
      await utils.getFileMessages.cancel();

      // step 2
      const previousMessages = utils.getFileMessages.getInfiniteData();

      // step 3
      utils.getFileMessages.setInfiniteData(
        { fileId, limit: INFINITE_QUERY_LIMIT },
        (old) => {
          if (!old) {
            return {
              pages: [],
              pageParams: [],
            };
          }

          let newPages = [...old.pages];

          let latestPage = newPages[0]!;

          latestPage.messages = [
            {
              createdAt: new Date().toISOString(),
              id: crypto.randomUUID(),
              text: message,
              isUserMessage: true,
            },
            ...latestPage.messages,
          ];

          newPages[0] = latestPage;

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      setIsLoading(true);

      return {
        previousMessages:
          previousMessages?.pages.flatMap((page) => page.messages) ?? [],
      };
    },
    onSuccess: async (stream) => {
      setIsLoading(false);

      if (!stream) {
        return toast({
          title: "There was a problem sending this message",
          description: "Please refresh this page and try again",
          variant: "destructive",
        });
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;

      // accumulated response
      let accResponse = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        accResponse += chunkValue;

        // append chunk to the actual message
        utils.getFileMessages.setInfiniteData(
          { fileId, limit: INFINITE_QUERY_LIMIT },
          (old) => {
            if (!old) return { pages: [], pageParams: [] };

            let isAiResponseCreated = old.pages.some((page) =>
              page.messages.some((message) => message.id === "ai-response")
            );

            let updatedPages = old.pages.map((page) => {
              if (page === old.pages[0]) {
                let updatedMessages;

                if (!isAiResponseCreated) {
                  updatedMessages = [
                    {
                      createdAt: new Date().toISOString(),
                      id: "ai-response",
                      text: accResponse,
                      isUserMessage: false,
                    },
                    ...page.messages,
                  ];
                } else {
                  updatedMessages = page.messages.map((message) => {
                    if (message.id === "ai-response") {
                      return {
                        ...message,
                        text: accResponse,
                      };
                    }
                    return message;
                  });
                }

                return {
                  ...page,
                  messages: updatedMessages,
                };
              }

              return page;
            });

            return { ...old, pages: updatedPages };
          }
        );
      }
    },

    onError: (_, __, context) => {
      setMessage(backupMessage.current);
      utils.getFileMessages.setData(
        { fileId },
        { messages: context?.previousMessages ?? [] }
      );
    },
    onSettled: async () => {
      setIsLoading(false);

      await utils.getFileMessages.invalidate({ fileId });
    },
  });

  // send the message that is present in the message state to the server.
  const addMessage = () => sendMessage({ message });

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  };

  return (
    <ChatContext.Provider
      value={{
        message,
        addMessage,
        handleInputChange,
        isLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
