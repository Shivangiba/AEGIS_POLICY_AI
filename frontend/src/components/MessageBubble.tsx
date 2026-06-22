"use client";

import { useState, forwardRef } from "react";
import type { Message } from "../lib/types";
import SourcesPanel from "./SourcesPanel";
import { WarningIcon } from "./icons";

type MessageBubbleProps = {
  message: Message;
};

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message }, ref) {
    const [timestamp] = useState(() => new Date());
    const isUser = message.role === "user";
    const isRouted = message.routed === true;

    if (isUser) {
      return (
        <div ref={ref} className="flex justify-end px-4 sm:px-6 py-2 scroll-mt-4">
          <div className="max-w-[85%] sm:max-w-lg">
            <div
              className="px-4 py-3 bg-clockwork text-linen rounded-2xl rounded-br-md
                shadow-warm-sm leading-relaxed whitespace-pre-wrap"
            >
              {message.content}
            </div>
            <p className="text-[11px] text-weathered mt-1 text-right pr-1">
              {formatTimestamp(timestamp)}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start px-4 sm:px-6 py-2">
        <div className="max-w-[90%] sm:max-w-2xl w-full">
          <div
            className={`px-1 py-1 leading-relaxed whitespace-pre-wrap text-deepolive
              ${isRouted ? "border-l-[3px] border-mauve pl-4 bg-mauve-muted rounded-r-lg py-3 pr-3" : ""}`}
          >
            {isRouted && (
              <div className="flex items-center gap-1.5 mb-2 text-mauve text-xs font-medium">
                <WarningIcon className="w-3.5 h-3.5" />
                <span>Escalated to HR compliance</span>
              </div>
            )}
            <p className="text-[15px] leading-7">{message.content}</p>
            {message.sourceChunks && message.sourceChunks.length > 0 && (
              <SourcesPanel sourceChunks={message.sourceChunks} />
            )}
          </div>
          <p className="text-[11px] text-weathered mt-1 pl-1">
            {formatTimestamp(timestamp)}
            {message.routed === false && (
              <span className="ml-2 text-cedar/70">· Policy-based answer</span>
            )}
          </p>
        </div>
      </div>
    );
  }
);

export default MessageBubble;
