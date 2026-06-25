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
  document_id: string;
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
  conversation_id?: string;
};

export type ConversationHistoryItem = {
  question: string;
  answer: string;
  timestamp: string;
};

export interface ConversationResponse {
  _id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  document_id?: string;
}


export type ConversationListResponse = {
  conversations: ConversationResponse[];
};

export type ConversationDetailResponse = {
  id: string;
  title: string;
  document_id?: string;
  conversation_history: ConversationHistoryItem[];
};

export interface DocumentResponse {
  id: string;
  filename: string;
  upload_timestamp: string;
  gridfs_id: string;
  processing_status: string;
  last_chat_at?: string;
}
