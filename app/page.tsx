"use client";

import { MessageBubble, TypingBubble } from "./components/message-bubble";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
  
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
  
    setMessages((prev) => [...prev, userMessage]);
  
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
        }),
      });
  
      const data = await response.json();
  
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
      };
  
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
  
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "请求失败，请检查网络或API配置。",
      };
  
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-[#212121] text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-3">
        <h1 className="text-center text-lg font-semibold tracking-tight">
          AI Chat
        </h1>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
            {messages.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center text-zinc-500">
                <p className="text-2xl font-medium text-zinc-400">
                  有什么可以帮你的？
                </p>
                <p className="mt-2 text-sm">在下方输入消息开始对话</p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                />
              ))
            )}
            {isLoading && <TypingBubble />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-800 bg-[#212121] px-4 pb-6 pt-4">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-3 rounded-2xl border border-zinc-700 bg-[#2f2f2f] px-4 py-3 shadow-lg focus-within:border-zinc-500">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息…"
                rows={1}
                className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#212121] transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-400"
                aria-label="发送"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-600">
              Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
