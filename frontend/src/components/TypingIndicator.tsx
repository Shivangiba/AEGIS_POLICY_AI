export default function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 sm:px-6 py-2">
      <div className="flex items-center gap-1.5 px-4 py-3">
        <span className="sr-only">Assistant is typing</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-cedar animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
