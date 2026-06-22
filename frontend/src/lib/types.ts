/**
 * Represents a single message in the chat history.
 */
export type Message = {
  role: "user" | "assistant";
  content: string;
  sourceChunks?: string[];
  routed?: boolean;
};

/**
 * Represents the response from the document upload endpoint.
 */
export type UploadResponse = {
  session_id: string;
  filename: string;
  chunk_count: number;
  status: string;
};

/**
 * Represents the response from the chat endpoint.
 */
export type ChatResponse = {
  answer: string;
  source_chunks: string[];
  routed: boolean;
};
