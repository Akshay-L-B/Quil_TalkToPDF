import {} from "langchain/document";

import axios from "axios";

export const vectorizeDocuments = async (
  documents: string[]
): Promise<number[][]> => {
  const response = await axios.post("http://127.0.0.1:8000/vectorize", {
    documents,
  });
  return response.data.vectors;
};
