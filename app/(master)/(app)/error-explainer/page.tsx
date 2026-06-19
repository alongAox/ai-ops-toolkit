"use client";

import { IconActivity, IconAlert, IconShield } from "../../../components/dashboard-icons";
import {
  buildAiResultFromMessages,
  buildErrorExplainerUserInput,
  ERROR_EXPLAINER_TYPE,
  formatRecordTime,
  saveAnalysisRecord,
} from "../../../../lib/analysis-records";
import { useEffect, useRef, useState } from "react";

const MAX_ERROR_SIZE = 50 * 1024;
const MAX_CACHE_ITEMS = 20;
const CACHE_STORAGE_KEY = "error-explainer-pending-issues";

const ERROR_EXAMPLES = [
  {
    label: "502",
    content: `502 Bad Gateway
connect() failed (111: Connection refused) while connecting to upstream`,
  },
  {
    label: "CrashLoopBackOff",
    content: `Back-off restarting failed container
Reason: CrashLoopBackOff
Exit Code: 1`,
  },
  {
    label: "connection refused",
    content: `dial tcp 10.0.1.25:3306: connect: connection refused
Error: connection refused on port 3306`,
  },
] as const;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CachedIssue = {
  id: string;
  savedAt: number;
  errorText: string;
  chatMessages: ChatMessage[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSavedAt(ts: number): string {
  return formatRecordTime(new Date(ts).toISOString());
}

function errorPreview(text: string, max = 72): string {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

function createCacheEntry(
  errorText: string,
  chatMessages: ChatMessage[]
): CachedIssue {
  return {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    errorText,
    chatMessages,
  };
}

export default function ErrorExplainerPage() {
  const [errorText, setErrorText] = useState("");
  const [cachedIssues, setCachedIssues] = useState<CachedIssue[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastAnalyzedError, setLastAnalyzedError] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasAnalysis = chatMessages.length > 0;
  const canAnalyze = !isLoading && errorText.trim().length > 0;
  const canFollowUp =
    !isLoading && hasAnalysis && followUpInput.trim().length > 0;
  const canManualStash =
    !isLoading &&
    lastAnalyzedError.trim().length > 0 &&
    chatMessages.length > 0;
  const canSaveRecord =
    !isLoading &&
    !isSaving &&
    hasAnalysis &&
    supabaseReady !== false &&
    (lastAnalyzedError.trim().length > 0 || errorText.trim().length > 0);

  const sessionStatus = isLoading
    ? "analyzing"
    : hasAnalysis
      ? "active"
      : "idle";
  const statusLabel =
    sessionStatus === "analyzing"
      ? "分析中"
      : sessionStatus === "active"
        ? "会话进行中"
        : "待命";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedIssue[];
        if (Array.isArray(parsed)) {
          setCachedIssues(parsed);
        }
      }
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cachedIssues));
    } catch {
      /* ignore quota errors */
    }
  }, [cachedIssues]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoading]);

  const pushToCache = (errorSnapshot: string, messagesSnapshot: ChatMessage[]) => {
    if (!errorSnapshot.trim() || messagesSnapshot.length === 0) return;
    setCachedIssues((prev) =>
      [createCacheEntry(errorSnapshot, messagesSnapshot), ...prev].slice(
        0,
        MAX_CACHE_ITEMS
      )
    );
  };

  const stashActiveSessionIfNeeded = (nextErrorText: string) => {
    const hasActiveSession =
      lastAnalyzedError.trim().length > 0 && chatMessages.length > 0;
    const switchingToNewError =
      nextErrorText.trim() !== lastAnalyzedError.trim();

    if (hasActiveSession && switchingToNewError) {
      pushToCache(lastAnalyzedError, chatMessages);
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    const nextError = errorText.trim();
    stashActiveSessionIfNeeded(nextError);

    setIsLoading(true);
    setChatMessages([]);
    setFollowUpInput("");
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "error-explainer",
          logs: nextError,
        }),
      });
      const data = await response.json();
      setLastAnalyzedError(nextError);
      setChatMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content ?? "未收到分析结果。",
        },
      ]);
    } catch {
      setError("请求失败，请检查网络或 API 配置。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!canFollowUp) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: followUpInput.trim(),
    };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setFollowUpInput("");
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "error-explainer-followup",
          logs: errorText.trim() || undefined,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content ?? "未收到回复。",
        },
      ]);
    } catch {
      setError("请求失败，请检查网络或 API 配置。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleAnalyze();
    }
  };

  const handleFollowUpKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleFollowUp();
    }
  };

  const handleManualStash = () => {
    if (!canManualStash) return;
    pushToCache(lastAnalyzedError, chatMessages);
    setErrorText("");
    setLastAnalyzedError("");
    setChatMessages([]);
    setFollowUpInput("");
    setError("");
  };

  const handleRestoreCachedIssue = (item: CachedIssue) => {
    if (isLoading) return;
    stashActiveSessionIfNeeded(item.errorText);

    setErrorText(item.errorText);
    setLastAnalyzedError(item.errorText);
    setChatMessages(item.chatMessages);
    setFollowUpInput("");
    setError("");
    setCachedIssues((prev) => prev.filter((c) => c.id !== item.id));
  };

  const handleDeleteCachedIssue = (id: string) => {
    setCachedIssues((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearCache = () => {
    setCachedIssues([]);
  };

  const handleExampleClick = (example: string) => {
    setErrorText(example);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    setError("");
  };

  const handleSaveRecord = async () => {
    if (!canSaveRecord) return;
    setIsSaving(true);
    setError("");
    const inputSnapshot = lastAnalyzedError.trim() || errorText.trim();
    const result = await saveAnalysisRecord({
      analysisType: ERROR_EXPLAINER_TYPE,
      userInput: buildErrorExplainerUserInput(inputSnapshot),
      aiResult: buildAiResultFromMessages(chatMessages),
    });
    if (!result.ok) {
      setError(result.error);
      if (result.status === 503) {
        setSupabaseReady(false);
      }
    } else {
      setSupabaseReady(true);
      showNotice("分析记录已保存至历史记录");
    }
    setIsSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              Error Explainer
            </h1>
            <p className="text-[11px] text-slate-500">
              智能解释错误信息，支持排查追问
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 sm:flex">
              <span
                className={`status-dot ${
                  sessionStatus === "analyzing"
                    ? "status-dot--busy"
                    : sessionStatus === "active"
                      ? "status-dot--live"
                      : "status-dot--idle"
                }`}
              />
              <span className="text-xs text-slate-400">{statusLabel}</span>
            </div>
            <button
              type="button"
              onClick={handleSaveRecord}
              disabled={!canSaveRecord}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-transparent disabled:text-slate-500"
            >
              {isSaving ? "保存中…" : "保存记录"}
            </button>
            <button
              type="button"
              onClick={handleManualStash}
              disabled={!canManualStash}
              className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-transparent disabled:text-slate-500"
            >
              暂存当前
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {isLoading && !hasAnalysis
                ? "分析中…"
                : hasAnalysis
                  ? "重新分析"
                  : "分析"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* 左侧：错误输入 + 问题缓存区 */}
          <div className="flex min-h-0 flex-col gap-4">
            <section className="dashboard-panel flex min-h-[280px] flex-1 flex-col">
              <div className="dashboard-panel-header flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <IconAlert className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-medium text-slate-200">错误输入</h2>
                </div>
                <span className="text-[10px] text-slate-600">
                  {errorText.length > 0
                    ? `${errorText.length} 字符 · ${formatBytes(new Blob([errorText]).size)}`
                    : "粘贴报错信息或堆栈"}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                {error && (
                  <div
                    className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                {notice && (
                  <div
                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
                    role="status"
                  >
                    {notice}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-600">示例：</span>
                  {ERROR_EXAMPLES.map(({ label, content }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleExampleClick(content)}
                      disabled={isLoading}
                      className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={errorText}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_ERROR_SIZE) {
                      setErrorText(e.target.value);
                    }
                  }}
                  onKeyDown={handleErrorKeyDown}
                  placeholder={
                    "# 粘贴错误信息、异常堆栈或报错弹窗内容\n" +
                    "# 例：HTTP 502、NullPointerException、ORA-12154、CrashLoopBackOff"
                  }
                  spellCheck={false}
                  disabled={isLoading}
                  className="log-editor min-h-[180px] flex-1 resize-none rounded-lg p-4 text-sm leading-relaxed text-amber-50/90 placeholder:text-slate-600 outline-none disabled:opacity-60"
                />

                <p className="text-[10px] text-slate-600">
                  Ctrl+Enter 快速分析
                </p>
              </div>
            </section>

            <section className="dashboard-panel flex min-h-[280px] flex-1 flex-col">
              <div className="dashboard-panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <IconActivity className="h-4 w-4 text-sky-500" />
                  <h2 className="text-sm font-medium text-slate-200">问题缓存区</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualStash}
                    disabled={!canManualStash}
                    className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    暂存当前
                  </button>
                  <span className="text-[10px] text-slate-600">
                    {cachedIssues.length > 0
                      ? `${cachedIssues.length} 个暂存问题`
                      : "暂无暂存"}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={isLoading || cachedIssues.length === 0}
                    className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    清空
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
                {cachedIssues.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-[#080c10]/60 px-4 py-8 text-center">
                    <p className="text-sm text-slate-500">暂无暂存问题</p>
                    <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-600">
                      当前问题尚未解决时，可点击「暂存当前」手动保存；或分析新报错时自动暂存，便于稍后恢复继续排查
                    </p>
                  </div>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {cachedIssues.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-slate-800 bg-[#080c10] p-3"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs text-sky-100/90">
                              {errorPreview(item.errorText)}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-600">
                              {formatSavedAt(item.savedAt)} ·{" "}
                              {item.chatMessages.length} 条对话
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreCachedIssue(item)}
                            disabled={isLoading}
                            className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            恢复
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCachedIssue(item.id)}
                            disabled={isLoading}
                            className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-slate-600 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            删除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-[10px] text-slate-600">
                  手动暂存或分析新错误时，当前会话会保存至此；恢复后从缓存区移除
                </p>
              </div>
            </section>
          </div>

          {/* 右侧：分析结果与追问 */}
          <section className="dashboard-panel flex min-h-[420px] flex-col lg:min-h-[calc(100vh-180px)]">
            <div className="dashboard-panel-header flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <IconShield className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-medium text-slate-200">
                  分析结果与追问
                </h2>
              </div>
              {hasAnalysis && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {chatMessages.length > 1 ? `${chatMessages.length} 条消息` : "已生成"}
                </span>
              )}
              {hasAnalysis && (
                <button
                  type="button"
                  onClick={handleSaveRecord}
                  disabled={!canSaveRecord}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "保存中…" : "保存记录"}
                </button>
              )}
            </div>

            <div
              role="region"
              aria-live="polite"
              aria-busy={isLoading}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {!hasAnalysis && !isLoading && (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                    <div className="mb-4 rounded-full border border-slate-700 bg-slate-800/50 p-4">
                      <IconAlert className="h-8 w-8 text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-500">等待错误输入</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-600">
                      分析完成后可继续追问；若需切换处理其他报错，当前会话会自动暂存至左侧缓存区
                    </p>
                  </div>
                )}

                {chatMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[95%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "chat-bubble-user text-white"
                          : "chat-bubble-ai border border-slate-700/80 bg-slate-800/40 text-slate-200"
                      }`}
                    >
                      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        {message.role === "user" ? (
                          "Operator"
                        ) : index === 0 ? (
                          <>
                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                            Error Analysis
                          </>
                        ) : (
                          "AI Assistant"
                        )}
                      </p>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                        {message.content}
                      </pre>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="status-dot status-dot--busy" />
                    {hasAnalysis ? "AI 正在思考…" : "正在分析错误信息…"}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {hasAnalysis && (
                <div className="shrink-0 border-t border-slate-800 bg-slate-900/30 p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      onKeyDown={handleFollowUpKeyDown}
                      placeholder="追问：例如「执行 kubectl logs 后出现新报错，接下来怎么做？」"
                      rows={2}
                      disabled={isLoading}
                      className="min-h-[40px] flex-1 resize-none rounded-lg border border-slate-700 bg-[#080c10] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500/50 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleFollowUp}
                      disabled={!canFollowUp}
                      className="btn-primary shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:text-slate-500"
                    >
                      发送
                    </button>
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-slate-600">
                    Enter 发送 · Shift+Enter 换行
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
