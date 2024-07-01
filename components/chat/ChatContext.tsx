import { createContext, useState } from "react";
import { useToast } from "../ui/use-toast";
import { useMutation } from "@tanstack/react-query";

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
