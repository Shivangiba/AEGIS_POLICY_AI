"use client";

import { useState, ChangeEvent, DragEvent } from "react";
import { UploadIcon, SpinnerIcon } from "./icons";

type UploadScreenProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  error: string | null;
};

export default function UploadScreen({
  fileInputRef,
  handleFileChange,
  onFileSelected,
  isUploading,
  error,
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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-8 py-12">
      <div className="w-full max-w-lg text-center">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-cafenoir mb-3">
          HR Policy Assistant
        </h1>
        <p className="text-cedar text-base sm:text-lg mb-10 leading-relaxed">
          Upload your employee handbook or HR policy document, then ask questions
          and get grounded answers from the source material.
        </p>

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
          className={`relative p-10 sm:p-14 rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-200 ease-in-out shadow-warm-sm
            ${isDragging
              ? "border-clockwork bg-latte/40 scale-[1.01] shadow-warm-md"
              : "border-cedar/50 bg-linen/80 hover:border-clockwork hover:bg-latte/20"
            }
            ${isUploading ? "pointer-events-none opacity-70" : ""}`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <SpinnerIcon className="w-10 h-10 text-clockwork" />
            ) : (
              <div className="p-4 rounded-full bg-latte/40 text-clockwork">
                <UploadIcon />
              </div>
            )}

            <div>
              <p className="text-base font-medium text-cafenoir">
                {isUploading ? "Uploading your document…" : "Drop your PDF here"}
              </p>
              <p className="text-sm text-cedar mt-1.5">
                {isUploading
                  ? "Indexing policy sections for search"
                  : "or click to browse · PDF files only"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 px-4 py-3 rounded-xl text-sm text-mauve bg-mauve-muted
              border border-mauve/20 text-left"
          >
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
