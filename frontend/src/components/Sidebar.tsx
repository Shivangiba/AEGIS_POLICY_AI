"use client";

import { useState } from "react";
import type { Message, UploadResponse, DocumentResponse } from "../lib/types";
import { DocumentIcon, PlusIcon, PanelIcon } from "./icons";
import { MessageSquare, Folder, FileText, Trash2, Calendar, MessageCircle, AlertTriangle } from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  sessionInfo: UploadResponse | null;
  messages: Message[];
  onStartOver: () => void;
  onNavigateToMessage: (messageIndex: number) => void;
  conversations: any[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  documents?: DocumentResponse[];
  onSelectDocument?: (doc: DocumentResponse) => void;
  onDeleteDocument?: (id: string) => void;
};

function truncate(text: string, maxLen = 40): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}…`;
}

function formatRelativeDate(isoString?: string) {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Sidebar({
  isOpen,
  onToggle,
  onClose,
  sessionInfo,
  messages,
  onStartOver,
  onNavigateToMessage,
  conversations,
  activeConversationId,
  onSelectConversation,
  documents = [],
  onSelectDocument,
  onDeleteDocument,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"conversations" | "documents">("conversations");
  const [documentToDelete, setDocumentToDelete] = useState<DocumentResponse | null>(null);

  const confirmDelete = () => {
    if (documentToDelete && onDeleteDocument) {
      onDeleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-cafenoir/30 backdrop-blur-sm transition-opacity duration-300
          md:hidden ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-lg">Delete Document</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Are you sure you want to delete <span className="font-medium text-slate-800">"{documentToDelete.filename}"</span>?
              </p>
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="font-medium mb-1 text-slate-600">This will permanently remove:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>PDF from storage</li>
                  <li>Document metadata</li>
                  <li>Associated vector embeddings</li>
                </ul>
              </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setDocumentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
          {sessionInfo ? (
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
          ) : (
             <div className="p-4 border-b border-cedar/15 flex items-center justify-center">
               <p className="text-sm text-cedar italic">No active document</p>
             </div>
          )}

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

          {/* Tabs */}
          <div className="flex items-center px-3 mb-2">
            <div className="flex p-1 bg-cedar/10 rounded-lg w-full gap-1">
              <button
                onClick={() => setActiveTab("conversations")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md text-xs font-medium transition-colors
                  ${activeTab === "conversations" ? "bg-white text-clockwork shadow-sm" : "text-cafenoir/70 hover:text-cafenoir hover:bg-white/50"}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chats
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md text-xs font-medium transition-colors
                  ${activeTab === "documents" ? "bg-white text-clockwork shadow-sm" : "text-cafenoir/70 hover:text-cafenoir hover:bg-white/50"}`}
              >
                <Folder className="w-3.5 h-3.5" />
                Library
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
            
            {activeTab === "conversations" && (
              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cedar/70 px-2 mb-2 flex items-center justify-between">
                  <span>Conversations</span>
                  <span>({conversations.length})</span>
                </p>
                {conversations.length === 0 ? (
                   <div className="mt-8 flex flex-col items-center justify-center text-center px-4">
                     <div className="w-12 h-12 rounded-full bg-latte/50 flex items-center justify-center text-cafenoir/40 mb-3">
                       <MessageSquare className="w-6 h-6" />
                     </div>
                     <p className="text-sm font-medium text-cafenoir mb-1">No conversations yet</p>
                     <p className="text-xs text-weathered leading-relaxed">
                       Select a document from your library and start chatting to see your history here.
                     </p>
                   </div>
                ) : (
                   <ul className="space-y-1">
                     {conversations.map((conv) => (
                       <li key={conv.id}>
                         <button
                           type="button"
                           onClick={() => {
                             onSelectConversation(conv.id);
                             if (window.innerWidth < 768) onClose();
                           }}
                           className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ease-in-out truncate
                             ${activeConversationId === conv.id 
                                ? "bg-clockwork text-linen font-medium shadow-warm-sm" 
                                : "text-deepolive/80 hover:bg-latte/50 hover:text-cafenoir"
                             }`}
                           title={conv.title}
                         >
                           {truncate(conv.title)}
                         </button>
                       </li>
                     ))}
                   </ul>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cedar/70 px-2 mb-2 flex items-center justify-between">
                  <span>Documents</span>
                  <span>({documents.length})</span>
                </p>
                {documents.length === 0 ? (
                  <div className="mt-8 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-latte/50 flex items-center justify-center text-cafenoir/40 mb-3">
                      <Folder className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-cafenoir mb-1">No documents uploaded</p>
                    <p className="text-xs text-weathered leading-relaxed">
                      Upload your first policy document to get started.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc.id} className="group relative flex flex-col px-3 py-2.5 rounded-lg text-sm bg-white/40 border border-transparent hover:border-cedar/10 hover:bg-latte/50 transition-all duration-150">
                        <div className="flex items-start gap-2.5 pr-8">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="block font-medium text-cafenoir truncate mb-1" title={doc.filename}>{doc.filename}</span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-weathered">
                              <span className="flex items-center gap-1"><PanelIcon /> {doc.chunk_count || 0} chunks</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Uploaded: {formatRelativeDate(doc.upload_timestamp)}</span>
                              {doc.last_chat_at && (
                                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Last Chat: {formatRelativeDate(doc.last_chat_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onDeleteDocument && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocumentToDelete(doc);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {onSelectDocument && (
                           <button
                             onClick={() => {
                               onSelectDocument(doc);
                               if (window.innerWidth < 768) onClose();
                             }}
                             className="mt-3 w-full py-1.5 opacity-0 group-hover:opacity-100 bg-white text-clockwork text-xs font-medium rounded-md shadow-sm border border-clockwork/20 hover:bg-clockwork hover:text-white transition-all duration-200"
                           >
                             Start Chat
                           </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
