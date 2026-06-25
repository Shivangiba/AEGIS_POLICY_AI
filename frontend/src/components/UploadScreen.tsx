"use client";

import { useState, ChangeEvent, DragEvent } from "react";
import { UploadIcon, SpinnerIcon } from "./icons";
import type { DocumentResponse } from "../lib/types";
import { FileText, Clock, ChevronRight } from "lucide-react";

type UploadScreenProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  error: string | null;
  documents?: DocumentResponse[];
  onSelectDocument?: (doc: DocumentResponse) => void;
  isLoadingDocuments?: boolean;
};

export default function UploadScreen({
  fileInputRef,
  handleFileChange,
  onFileSelected,
  isUploading,
  error,
  documents = [],
  onSelectDocument,
  isLoadingDocuments = false,
}: UploadScreenProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      onFileSelected(file);
    }
  };

  const openFilePicker = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  return (
    <main className="flex h-full flex-1 w-full flex-col items-center justify-center px-4 sm:px-8 py-12 bg-linen relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-clockwork/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-clockwork/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-3xl flex flex-col items-center relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-warm-sm border border-latte mb-6">
             <div className="w-10 h-10 bg-gradient-to-tr from-clockwork to-clockwork-hover rounded-xl flex items-center justify-center text-linen shadow-inner">
                <FileText className="w-6 h-6" />
             </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-cafenoir mb-4">
            Aegis Policy AI
          </h1>
          <p className="text-cedar text-lg max-w-xl mx-auto leading-relaxed">
            Upload your employee handbook or select an existing policy to instantly get answers, summaries, and deep insights.
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white rounded-3xl shadow-warm-md border border-latte overflow-hidden">
          <div className="flex flex-col md:flex-row">
            
            {/* Upload Dropzone */}
            <div 
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openFilePicker();
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group min-h-[320px]
                ${isDragging ? "bg-latte/50" : "bg-white hover:bg-latte/30"}
                ${isUploading ? "pointer-events-none opacity-80" : ""}`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                disabled={isUploading}
              />
              
              <div className={`absolute inset-4 rounded-2xl border-2 border-dashed transition-colors duration-300 pointer-events-none
                ${isDragging ? "border-clockwork bg-latte/30" : "border-cedar/20 group-hover:border-clockwork/50"}`} 
              />

              <div className="relative z-10 flex flex-col items-center">
                {isUploading ? (
                  <div className="relative w-16 h-16 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 border-4 border-clockwork/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-clockwork rounded-full border-t-transparent animate-spin" />
                    <FileText className="w-6 h-6 text-clockwork absolute animate-pulse" />
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300
                    ${isDragging ? "bg-clockwork/20 text-clockwork" : "bg-latte/40 text-cedar group-hover:bg-latte group-hover:text-clockwork"}`}>
                    <UploadIcon className="w-8 h-8" />
                  </div>
                )}

                <h3 className="text-lg font-semibold text-cafenoir mb-2">
                  {isUploading ? "Processing Document..." : "Upload New Policy"}
                </h3>
                <p className="text-sm text-cedar max-w-[220px] leading-relaxed">
                  {isUploading
                    ? "Extracting text and indexing sections for smart search. This takes just a moment."
                    : "Drag and drop your PDF here, or click to browse files."}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-gradient-to-b from-transparent via-latte to-transparent hidden md:block" />
            <div className="h-px bg-gradient-to-r from-transparent via-latte to-transparent block md:hidden" />

            {/* Recent Policies */}
            <div className="flex-[0.8] bg-latte/10 p-6 flex flex-col max-h-[320px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-semibold text-cafenoir uppercase tracking-wider">Recent Policies</h3>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {isLoadingDocuments ? (
                  <div className="flex flex-col items-center justify-center h-full text-weathered">
                    <SpinnerIcon className="w-6 h-6 mb-3 animate-spin" />
                    <span className="text-sm">Loading library...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-latte/40 flex items-center justify-center text-weathered/60 mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-cedar">Your library is empty.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {documents.slice(0, 5).map((doc) => (
                      <li key={doc.id}>
                        <button
                          onClick={() => onSelectDocument?.(doc)}
                          className="w-full text-left p-3 rounded-xl bg-white border border-latte shadow-warm-sm hover:border-clockwork/50 hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3 group"
                        >
                          <div className="p-2 rounded-lg bg-latte/50 text-clockwork group-hover:bg-clockwork/20 transition-colors shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-cafenoir truncate mb-0.5" title={doc.filename}>
                              {doc.filename}
                            </p>
                            <p className="text-xs text-weathered flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.upload_timestamp || '').toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-weathered/60 group-hover:text-clockwork transition-colors shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 px-5 py-4 rounded-2xl text-sm font-medium text-mauve bg-mauve-muted border border-mauve/20 shadow-warm-sm flex items-center gap-3 w-full animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="w-2 h-2 rounded-full bg-mauve shrink-0 animate-pulse" />
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
