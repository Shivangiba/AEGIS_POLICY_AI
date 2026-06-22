"use client";

import { useState, useRef, FormEvent, ChangeEvent, useEffect } from "react";
import {
  uploadDocument,
  sendChatMessage,
} from "../lib/api";
import type { UploadResponse, Message } from "../lib/types";
import Sidebar from "../components/Sidebar";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import UploadScreen from "../components/UploadScreen";
import { MenuIcon, PanelIcon } from "../components/icons";

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sessionInfo, setSessionInfo] = useState<UploadResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userMessageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatInput.trim() || !sessionInfo) return;

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
      const response = await sendChatMessage(
        sessionInfo.session_id,
        query,
        priorHistory
      );
      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        sourceChunks: response.source_chunks,
        routed: response.routed,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${(err as Error).message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartOver = () => {
    setSessionInfo(null);
    setUploadedFile(null);
    setMessages([]);
    setChatInput("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scrollToUserMessage = (messageIndex: number) => {
    const el = userMessageRefs.current.get(messageIndex);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Auto-scroll to latest user message when messages update or while sending
  useEffect(() => {
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const el = userMessageRefs.current.get(lastUserIndex);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [messages, isSending]);

  if (!sessionInfo) {
    return (
      <UploadScreen
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        onFileSelected={(file) => {
          setUploadedFile(file);
          handleUpload(file);
        }}
        isUploading={isUploading}
        error={error}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-linen">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onClose={() => setSidebarOpen(false)}
        sessionInfo={sessionInfo}
        messages={messages}
        onStartOver={handleStartOver}
        onNavigateToMessage={scrollToUserMessage}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-cedar/15 bg-linen/80 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 rounded-lg text-cafenoir hover:bg-latte/40
              transition-colors duration-200 ease-in-out"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <PanelIcon /> : <MenuIcon />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-lg font-semibold text-cafenoir truncate">
              HR Policy Assistant
            </h1>
            <p className="text-xs text-cedar truncate hidden sm:block">
              {sessionInfo.filename}
            </p>
          </div>
        </header>

        {/* Chat messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {messages.length === 0 && !isSending && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <p className="font-serif text-xl text-cafenoir mb-2">
                Ready to help
              </p>
              <p className="text-sm text-cedar max-w-md leading-relaxed">
                Ask anything about your uploaded policy document. Answers are
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

        {/* Sticky input */}
        <ChatInput
          chatInput={chatInput}
          setChatInput={setChatInput}
          isSending={isSending}
          onSubmit={handleSendMessage}
        />
      </div>
    </div>
  );
}
