import { removeStopwords } from "stopword";

// Utility function to clean text
export const cleanText = (text: string): string => {
  // Convert text to lowercase
  text = text.toLowerCase();

  // Remove punctuation and special characters
  text = text.replace(/[^a-zA-Z0-9\s]/g, "");

  // Tokenize the text
  const words = text.split(/\s+/);

  // Remove stopwords
  const cleanedWords = removeStopwords(words);

  // Join the cleaned words back into a single string
  const cleanedText = cleanedWords.join(" ");

  return cleanedText;
};
