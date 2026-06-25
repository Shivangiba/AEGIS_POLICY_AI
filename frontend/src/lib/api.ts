import axios, { AxiosError } from "axios";
import type { UploadResponse, ChatResponse, Message, ConversationListResponse, ConversationDetailResponse, DocumentResponse } from "./types";
import { supabase } from "./supabase";

/**
 * In the browser we use same-origin relative URLs (proxied by next.config rewrites).
 * Direct backend URL is only used for server-side calls, if any.
 */
const apiClient = axios.create({
  baseURL:
    typeof window !== "undefined"
      ? ""
      : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
});

apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

function formatApiError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string | { msg: string }[] }>;

    if (!axiosError.response) {
      if (axiosError.code === "ERR_NETWORK" || axiosError.code === "ECONNREFUSED") {
        return new Error("Network error: Cannot connect to backend");
      }
      return new Error(axiosError.message || fallback);
    }

    const status = axiosError.response.status;
    const data = axiosError.response.data;
    
    if (status === 401) {
      return new Error("Session expired. Please log in again.");
    }
    
    if (status === 403) {
      return new Error("You don't have permission to access this resource.");
    }
    
    if (status === 413) {
      return new Error("File is too large.");
    }
    
    if (status === 500) {
      return new Error("Server error. Please try again later.");
    }
    
    if (status === 503) {
      return new Error("Service unavailable. Backend is down.");
    }

    if (!data || !data.detail) {
      return new Error(`Error ${status}: ${axiosError.response.statusText}`);
    }

    const { detail } = data;
    if (typeof detail === "string") {
      return new Error(detail);
    }
    if (Array.isArray(detail)) {
      return new Error(detail.map((d) => d.msg).join(", "));
    }
    
    return new Error(`Error ${status}: ${axiosError.response.statusText}`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function validateUploadFile(file: File): void {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Invalid file type. Only PDF files are allowed.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large. Maximum size is 25 MB.");
  }
  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }
}

/**
 * Uploads a document to the backend.
 * @param file The file to upload.
 * @returns A promise that resolves to the upload response.
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  validateUploadFile(file);

  const formData = new FormData();
  formData.append("file", file);

  try {
    // Do not set Content-Type — axios must add the multipart boundary automatically.
    const response = await apiClient.post<UploadResponse>("/api/upload", formData);
    return response.data;
  } catch (error) {
    throw formatApiError(error, "An unknown error occurred during upload.");
  }
}

/**
 * Sends a chat message to the backend.
 * @param sessionId The current session ID.
 * @param query The user's query.
 * @param chatHistory The history of messages in the current chat.
 * @returns A promise that resolves to the chat response.
 */
export async function sendChatMessage(
  documentId: string,
  query: string,
  chatHistory: { role: "user" | "assistant"; content: string }[] = [],
  conversationId?: string
): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>("/api/chat/message", {
      document_ids: [documentId],
      query: query,
      chat_history: chatHistory,
      conversation_id: conversationId,
    });
    return response.data;
  } catch (error) {
    throw formatApiError(error, "An unknown error occurred while sending the message.");
  }
}

export async function getConversations(): Promise<ConversationListResponse> {
  try {
    const response = await apiClient.get<ConversationListResponse>("/api/chat/conversations");
    return response.data;
  } catch (error) {
    throw formatApiError(error, "Failed to fetch conversations.");
  }
}

export async function getConversationDetail(id: string): Promise<ConversationDetailResponse> {
  try {
    const response = await apiClient.get<ConversationDetailResponse>(`/api/chat/conversations/${id}`);
    return response.data;
  } catch (error) {
    throw formatApiError(error, "Failed to fetch conversation details.");
  }
}

export async function getDocuments(): Promise<DocumentResponse[]> {
  try {
    const response = await apiClient.get<DocumentResponse[]>("/api/documents");
    return response.data;
  } catch (error) {
    throw formatApiError(error, "Failed to fetch documents.");
  }
}

export async function getDocumentDetail(id: string): Promise<DocumentResponse> {
  try {
    const response = await apiClient.get<DocumentResponse>(`/api/documents/${id}`);
    return response.data;
  } catch (error) {
    throw formatApiError(error, "Failed to fetch document details.");
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/documents/${id}`);
  } catch (error) {
    throw formatApiError(error, "Failed to delete document.");
  }
}

// Export types for easy access in components
export type { UploadResponse, ChatResponse, Message };
