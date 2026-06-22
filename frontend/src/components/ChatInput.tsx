"use client";

import { useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import { SendIcon } from "./icons";

type ChatInputProps = {
  chatInput: string;
  setChatInput: (value: string) => void;
  isSending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const MAX_LINES = 5;
const LINE_HEIGHT = 24;

export default function ChatInput({
  chatInput,
  setChatInput,
  isSending,
  onSubmit,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_LINES + 16;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [chatInput]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && chatInput.trim()) {
        textareaRef.current?.form?.requestSubmit();
      }
    }
  };

  const canSend = !isSending && chatInput.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-cedar/15 bg-linen/95 backdrop-blur-sm px-4 sm:px-6 py-4">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div
          className="flex items-end gap-2 p-2 pl-4 rounded-2xl bg-linen border border-cedar/20
            shadow-warm-md transition-shadow duration-200 focus-within:shadow-warm-lg
            focus-within:border-clockwork/30"
        >
          <textarea
            ref={textareaRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your HR policy..."
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none bg-transparent py-2 text-[15px] text-deepolive
              placeholder:text-weathered/70 focus:outline-none leading-6
              max-h-[136px] overflow-y-auto custom-scrollbar"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="shrink-0 p-2.5 rounded-xl transition-all duration-200 ease-in-out
              bg-clockwork text-linen hover:bg-clockwork-hover
              disabled:bg-weathered/40 disabled:text-linen/70 disabled:cursor-not-allowed"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[11px] text-weathered/70 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
