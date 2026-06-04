type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
};

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isUser
            ? "bg-sky-600 text-white"
            : "bg-emerald-600 text-white"
        }`}
        aria-hidden
      >
        {isUser ? "你" : "AI"}
      </div>

      <div
        className={`message-bubble flex max-w-[min(85%,28rem)] flex-col ${
          isUser ? "message-bubble--user items-end" : "message-bubble--assistant items-start"
        }`}
      >
        <div
          className={`message-bubble__body px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
            isUser
              ? "bg-sky-600 text-white"
              : "border border-zinc-700/80 bg-zinc-800 text-zinc-100"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex w-full gap-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
        aria-hidden
      >
        AI
      </div>
      <div className="message-bubble message-bubble--assistant items-start">
        <div
          className="message-bubble__body flex items-center gap-3 border border-zinc-700/80 bg-zinc-800 px-4 py-3"
          role="status"
          aria-live="polite"
          aria-label="AI 正在思考"
        >
          <span className="thinking-text text-sm text-zinc-400">
            AI正在思考
          </span>
          <span className="flex items-center gap-1" aria-hidden>
            <span className="typing-dot" />
            <span className="typing-dot animation-delay-150" />
            <span className="typing-dot animation-delay-300" />
          </span>
        </div>
      </div>
    </div>
  );
}
