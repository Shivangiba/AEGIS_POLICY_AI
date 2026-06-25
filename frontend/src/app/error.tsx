"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-linen p-4 text-center text-cafenoir">
      <div className="max-w-md rounded-2xl border border-latte bg-white p-8 shadow-warm-md">
        <div className="mb-4 flex justify-center text-red-500">
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-4 font-serif text-2xl font-semibold">Something went wrong</h2>
        <p className="mb-6 text-sm text-cedar">
          {error.message || "An unexpected error occurred while loading the application."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-clockwork px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-clockwork/90"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
