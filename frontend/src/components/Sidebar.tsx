"use client";

import type { Message, UploadResponse } from "../lib/types";
import { DocumentIcon, PlusIcon, PanelIcon } from "./icons";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  sessionInfo: UploadResponse;
  messages: Message[];
  onStartOver: () => void;
  onNavigateToMessage: (messageIndex: number) => void;
};

function truncate(text: string, maxLen = 40): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}…`;
}

export default function Sidebar({
  isOpen,
  onToggle,
  onClose,
  sessionInfo,
  messages,
  onStartOver,
  onNavigateToMessage,
}: SidebarProps) {
  const userMessages = messages
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => msg.role === "user");

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-cafenoir/30 backdrop-blur-sm transition-opacity duration-300
          md:hidden ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed md:relative z-40 flex flex-col h-full border-r border-cedar/20
          bg-latte/30 transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-14"}`}
      >
        {/* Collapsed rail (desktop only) */}
        {!isOpen && (
          <div className="hidden md:flex flex-col items-center py-4 gap-4 h-full w-14 shrink-0">
            <button
              type="button"
              onClick={onToggle}
              className="p-2 rounded-lg text-cafenoir hover:bg-latte/50
                transition-colors duration-200 ease-in-out"
              aria-label="Open sidebar"
            >
              <PanelIcon />
            </button>
          </div>
        )}

        {/* Expanded content */}
        <div
          className={`flex flex-col h-full w-72 shrink-0 transition-opacity duration-200
            ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none absolute"}`}
        >
          <div className="p-4 border-b border-cedar/15">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-latte/50 text-cafenoir shrink-0">
                <DocumentIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-cafenoir truncate" title={sessionInfo.filename}>
                  {sessionInfo.filename}
                </p>
                <p className="text-xs text-cedar mt-0.5">
                  {sessionInfo.chunk_count} indexed chunks
                </p>
              </div>
            </div>
          </div>

          <div className="p-3">
            <button
              type="button"
              onClick={onStartOver}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                text-sm font-medium text-linen bg-clockwork hover:bg-clockwork-hover
                transition-colors duration-200 ease-in-out shadow-warm-sm"
            >
              <PlusIcon className="w-4 h-4" />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cedar/70 px-2 mb-2">
              This session
            </p>
            {userMessages.length === 0 ? (
              <p className="text-xs text-weathered px-2 py-4">
                No questions yet. Start chatting!
              </p>
            ) : (
              <ul className="space-y-1">
                {userMessages.map(({ msg, index }) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToMessage(index);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-deepolive/80
                        hover:bg-latte/50 hover:text-cafenoir
                        transition-colors duration-150 ease-in-out truncate"
                      title={msg.content}
                    >
                      {truncate(msg.content)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
