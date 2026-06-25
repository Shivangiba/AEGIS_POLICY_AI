"use client";

import { useState, useRef, FormEvent, ChangeEvent, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  uploadDocument,
  sendChatMessage,
  getConversations,
  getConversationDetail,
  getDocuments,
  getDocumentDetail,
  deleteDocument,
} from "../lib/api";
import type { UploadResponse, Message, ConversationResponse, DocumentResponse } from "../lib/types";
import Sidebar from "../components/Sidebar";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import UploadScreen from "../components/UploadScreen";
import { MenuIcon, PanelIcon } from "../components/icons";
import { LogOut, User as UserIcon } from "lucide-react";

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sessionInfo, setSessionInfo] = useState<UploadResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Documents State
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Auth and Conversations State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show banner if user landed here with ?expired=1 (e.g. manual back navigation)
  const [showExpiredBanner, setShowExpiredBanner] = useState(
    searchParams.get("expired") === "1"
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Helper: redirect to login with expired flag so login page can show a message
  const redirectToLogin = useCallback(() => {
    router.push("/login?expired=1");
  }, [router]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch conversations";
      // Backend returns 401 as "Invalid authentication credentials" or "Token has expired"
      if (
        msg.includes("Invalid authentication") ||
        msg.includes("Token has expired") ||
        msg.includes("Unauthorized") ||
        msg.includes("401")
      ) {
        redirectToLogin();
      } else {
        setError(msg);
      }
    }
  }, [redirectToLogin]);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoadingDocuments(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!session) {
          redirectToLogin();
        } else {
          setUser(session.user);
          await fetchConversations();
          await fetchDocuments();
        }
      } catch (err) {
        console.error("Auth check failed", err);
        if (isMounted) redirectToLogin();
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    checkAuth();

    return () => { isMounted = false; };
  }, [redirectToLogin, fetchConversations, fetchDocuments]);

  // Subscribe to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Token refresh failed or user signed out elsewhere — force redirect
        redirectToLogin();
      } else if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [redirectToLogin]);

  const handleSelectConversation = async (id: string) => {
    try {
      setError(null);
      const detail = await getConversationDetail(id);
      setActiveConversationId(detail.id);

      // Fetch active document details if available
      if (detail.document_id) {
        try {
          const doc = await getDocumentDetail(detail.document_id);
          setSessionInfo({
            document_id: doc.id,
            filename: doc.filename,
            chunk_count: 0,
            status: "ready",
          });
        } catch (docErr) {
          console.error("Failed to fetch document details for conversation", docErr);
        }
      } else {
        setSessionInfo(null);
      }

      const loadedMessages: Message[] = [];
      detail.conversation_history.forEach((turn) => {
        loadedMessages.push({ role: "user", content: turn.question });
        loadedMessages.push({ role: "assistant", content: turn.answer });
      });
      setMessages(loadedMessages);
    } catch (err) {
      const msg = (err as Error).message;
      if (
        msg.includes("Invalid authentication") ||
        msg.includes("Token has expired") ||
        msg.includes("Unauthorized") ||
        msg.includes("401")
      ) {
        redirectToLogin();
      } else {
        setError(msg);
      }
    }
  };

  const handleSelectDocument = (doc: DocumentResponse) => {
    // Simulate an upload response using the selected document's details
    // so the chat interface knows which document to query
    setSessionInfo({
      document_id: doc.id,
      filename: doc.filename,
      chunk_count: doc.chunk_count || 0, // not important for chatting
      status: "ready"
    });
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      if (sessionInfo?.document_id === id) {
        handleStartOver();
      } else {
        await fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to delete document", err);
      alert("Failed to delete document.");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const response = await uploadDocument(file);
      setSessionInfo(response);
      setMessages([]);
      setActiveConversationId(null);
      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (
        msg.includes("Invalid authentication") ||
        msg.includes("Token has expired") ||
        msg.includes("Unauthorized") ||
        msg.includes("401")
      ) {
        redirectToLogin();
      } else {
        setError(msg);
        alert(msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatInput.trim() || (!sessionInfo && !activeConversationId)) return;

    const query = chatInput.trim();
    const userMessage: Message = { role: "user", content: query };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatInput("");

    setIsSending(true);
    setError(null);

    const priorHistory = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      if (!sessionInfo && !activeConversationId) {
        setError("Please select or upload a document first to start a new chat.");
        setIsSending(false);
        return;
      }

      const response = await sendChatMessage(
        sessionInfo?.document_id || "past-session",
        query,
        priorHistory,
        activeConversationId || undefined
      );
      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        sourceChunks: response.source_chunks,
        routed: response.routed,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (response.conversation_id && !activeConversationId) {
        setActiveConversationId(response.conversation_id);
        fetchConversations();
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (
        msg.includes("Invalid authentication") ||
        msg.includes("Token has expired") ||
        msg.includes("Unauthorized") ||
        msg.includes("401")
      ) {
        redirectToLogin();
      } else {
        const errorMessage: Message = {
          role: "assistant",
          content: `Error: ${msg}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleStartOver = () => {
    setSessionInfo(null);
    setActiveConversationId(null); // Clear the active conversation to return to the selection screen
    setUploadedFile(null);
    setMessages([]);
    setChatInput("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Refresh documents so the user sees the latest when returning to the list
    fetchDocuments();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const scrollToUserMessage = (messageIndex: number) => {
    const el = userMessageRefs.current.get(messageIndex);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        chatContainerRef.current!.scrollTo({
          top: chatContainerRef.current!.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [messages, isSending]);

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center bg-linen text-cafenoir">Loading...</div>;
  }

  // If session expired and user is not authenticated, show a clear message
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-linen text-cafenoir gap-4">
        <p className="text-lg">Your session has expired.</p>
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-2 bg-clockwork text-white rounded-lg hover:bg-clockwork-hover transition-colors"
        >
          Log in again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-linen">
      {showExpiredBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-mauve/10 border-b border-mauve/20 text-mauve px-4 py-3 text-center text-sm flex items-center justify-center gap-3">
          <span>Your session has expired. Please log in again.</span>
          <button
            onClick={() => setShowExpiredBanner(false)}
            className="underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onClose={() => setSidebarOpen(false)}
        sessionInfo={sessionInfo}
        messages={messages}
        onStartOver={handleStartOver}
        onNavigateToMessage={scrollToUserMessage}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        documents={documents}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        {(!sessionInfo && !activeConversationId && messages.length === 0) ? (
          <>
            <div className="absolute top-4 left-4 z-50 md:hidden">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2 rounded-lg text-cafenoir bg-white/80 backdrop-blur shadow-warm-sm border border-latte hover:bg-latte/40 transition-colors"
              >
                <MenuIcon />
              </button>
            </div>
            <UploadScreen
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              onFileSelected={(file) => {
                setUploadedFile(file);
                handleUpload(file);
              }}
              isUploading={isUploading}
              error={error}
              documents={documents}
              onSelectDocument={handleSelectDocument}
              isLoadingDocuments={isLoadingDocuments}
            />
          </>
        ) : (
          <>
        <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-latte bg-white/80 backdrop-blur-sm shadow-warm-sm z-10 relative">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 rounded-lg text-cedar hover:bg-latte/40
                transition-colors duration-200 ease-in-out"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <PanelIcon /> : <MenuIcon />}
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-cafenoir truncate text-lg">
                Aegis Policy AI
              </h1>
              {sessionInfo?.filename && (
                <p className="text-sm font-medium text-clockwork truncate flex items-center gap-1 mt-0.5" title={sessionInfo.filename}>
                  📄 {sessionInfo.filename}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-cafenoir bg-linen px-3 py-1.5 rounded-full border border-latte">
                <UserIcon className="w-4 h-4 text-clockwork" />
                <span className="truncate max-w-[150px]">{user.email}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {messages.length === 0 && !isSending && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <p className="font-bold text-2xl tracking-tight text-cafenoir mb-2">
                Ready to help
              </p>
              <p className="text-sm text-cedar max-w-md leading-relaxed">
                Ask anything about your policy document. Answers are
                grounded in the source material with cited references.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <MessageBubble
              key={index}
              message={msg}
              ref={
                msg.role === "user"
                  ? (el) => {
                    if (el) userMessageRefs.current.set(index, el);
                    else userMessageRefs.current.delete(index);
                  }
                  : undefined
              }
            />
          ))}

          {isSending && <TypingIndicator />}
        </div>

        <ChatInput
          chatInput={chatInput}
          setChatInput={setChatInput}
          isSending={isSending}
          onSubmit={handleSendMessage}
        />
          </>
        )}
      </div>
    </div>
  );
}