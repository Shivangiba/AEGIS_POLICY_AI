"use client";

import { useState } from "react";
import { ChevronDownIcon, DocumentIcon } from "./icons";

type SourcesPanelProps = {
  sourceChunks: string[];
};

export default function SourcesPanel({ sourceChunks }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sourceChunks.length) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          bg-latte-muted text-cedar border border-cedar/20
          hover:bg-latte/40 hover:border-cedar/40
          transition-all duration-200 ease-in-out"
        aria-expanded={expanded}
      >
        <DocumentIcon className="w-3.5 h-3.5" />
        <span>Sources ({sourceChunks.length})</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`sources-collapse mt-2 ${expanded ? "expanded" : ""}`}>
        <div>
          <div className="space-y-2 pt-1">
            {sourceChunks.map((chunk, i) => (
              <div
                key={i}
                className="p-3 rounded-lg text-xs leading-relaxed text-deepolive/80
                  bg-latte-muted border-l-[3px] border-cedar"
              >
                &ldquo;{chunk}&rdquo;
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
