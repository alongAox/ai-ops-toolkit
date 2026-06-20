"use client";

import { useCallback, useEffect, useRef } from "react";

export const TOAST_DURATION_MS = 2000;

type ToastPopupProps = {
  message: string;
  onDone?: () => void;
  variant?: "success" | "neutral";
};

export function ToastPopup({
  message,
  onDone,
  variant = "success",
}: ToastPopupProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finishedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current?.();
  }, []);

  useEffect(() => {
    const timer = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [dismiss]);

  const panelClass =
    variant === "success"
      ? "border-emerald-500/40 bg-[#0b0f14]/95 text-emerald-300"
      : "border-slate-600 bg-[#0b0f14]/95 text-slate-200";

  const closeClass =
    variant === "success"
      ? "text-emerald-400/70 hover:bg-emerald-500/15 hover:text-emerald-300"
      : "text-slate-400 hover:bg-slate-700/80 hover:text-slate-200";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border py-3 pl-4 pr-2 text-sm font-medium shadow-2xl backdrop-blur-md ${panelClass}`}
      >
        <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="关闭"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg leading-none transition-colors ${closeClass}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
