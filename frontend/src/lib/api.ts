import axios, { AxiosError } from "axios";
import type { UploadResponse, ChatResponse, Message } from "./types";

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

function formatApiError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string | { msg: string }[] }>;

    console.error("[API Error]", {
      message: axiosError.message,
      code: axiosError.code,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      data: axiosError.response?.data,
      url: axiosError.config?.url,
      baseURL: axiosError.config?.baseURL,
      method: axiosError.config?.method,
    });

    if (axiosError.response) {
      const { detail } = axiosError.response.data ?? {};
      if (typeof detail === "string") {
        return new Error(detail);
      }
      if (Array.isArray(detail)) {
        return new Error(detail.map((d) => d.msg).join(", "));
      }
      return new Error(
        `Request failed (${axiosError.response.status} ${axiosError.response.statusText})`
      );
    }

    if (axiosError.code === "ERR_NETWORK") {
      return new Error(
        `Network error: ${axiosError.message}. ` +
          "If the backend logged 200 OK but the UI failed, this is usually a CORS/origin block — " +
          "open DevTools → Network, select the upload request, and check for a CORS error on the response."
      );
    }

    return new Error(axiosError.message || fallback);
  }

  if (error instanceof Error) {
    console.error("[API Error]", error);
    return error;
  }

  console.error("[API Error]", error);
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
  sessionId: string,
  query: string,
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>("/api/chat", {
      session_id: sessionId,
      query: query,
      chat_history: chatHistory,
    });
    return response.data;
  } catch (error) {
    throw formatApiError(error, "An unknown error occurred while sending the message.");
  }
}

// Export types for easy access in components
export type { UploadResponse, ChatResponse, Message };
