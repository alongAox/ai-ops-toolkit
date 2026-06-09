"use client";

import { useEffect, useRef, useState } from "react";
import { IconDocument, IconTerminal } from "./dashboard-icons";

const MAX_LOG_SIZE = 5 * 1024 * 1024;
const MAX_SAVED_REPORTS = 30;
const STORAGE_KEY = "ai-analyzer-daily-reports";

type SavedReport = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  sourceHint?: string;
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "UTF-8");
  });
}

function isLogFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".log") ||
    file.type === "text/plain" ||
    file.type === "application/octet-stream" ||
    file.type === ""
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildReportTitle(date: Date): string {
  return `运维日报 ${date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function buildDownloadFilename(report: SavedReport): string {
  const stamp = new Date(report.createdAt)
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "");
  return `运维日报-${stamp}.md`;
}

function loadSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReport[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.content === "string" &&
        typeof item.createdAt === "number"
    );
  } catch {
    return [];
  }
}

function persistSavedReports(reports: SavedReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function downloadReport(report: SavedReport) {
  const blob = new Blob([report.content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildDownloadFilename(report);
  link.click();
  URL.revokeObjectURL(url);
}

export function DailyReportGenerator() {
  const [logs, setLogs] = useState("");
  const [logFileName, setLogFileName] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  const logInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const activeReport =
    savedReports.find((report) => report.id === activeReportId) ?? null;

  const canGenerate = !isLoading && logs.trim().length > 0;
  const logLines = logs.trim() ? logs.split("\n").length : 0;

  useEffect(() => {
    const stored = loadSavedReports();
    setSavedReports(stored);
    if (stored.length > 0) {
      setActiveReportId(stored[0].id);
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistSavedReports(savedReports);
  }, [savedReports]);

  const showNotice = (message: string) => {
    setNotice(message);
    setError("");
  };

  const importLogFile = async (file: File) => {
    if (!isLogFile(file)) {
      setError("请提供 .log 或纯文本日志文件。");
      return;
    }
    if (file.size > MAX_LOG_SIZE) {
      setError("日志文件不能超过 5 MB。");
      return;
    }
    try {
      const text = await readFileAsText(file);
      setLogs(text);
      setLogFileName(file.name || "未命名.log");
      showNotice(`已加载：${file.name || "未命名.log"}`);
    } catch {
      setError("读取日志文件失败，请确认文件编码为 UTF-8。");
    }
  };

  const handleLogFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await importLogFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isLoading) return;
    const file = e.clipboardData.files[0];
    if (file && isLogFile(file)) {
      e.preventDefault();
      void importLogFile(file);
    }
  };

  const handleClearInput = () => {
    setLogs("");
    setLogFileName(null);
    setError("");
    setNotice("");
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsLoading(true);
    setError("");
    setNotice("");
    setCopyHint("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "daily-report",
          logs: logs.trim(),
        }),
      });
      const data = await response.json();
      const content = data.content ?? "未收到日报内容。";
      const createdAt = Date.now();
      const newReport: SavedReport = {
        id: crypto.randomUUID(),
        title: buildReportTitle(new Date(createdAt)),
        content,
        createdAt,
        sourceHint: logFileName ?? `${logLines} 行日志`,
      };

      setSavedReports((prev) => {
        const next = [newReport, ...prev];
        return next.slice(0, MAX_SAVED_REPORTS);
      });
      setActiveReportId(newReport.id);
      showNotice("日报已生成并暂存，可继续输入新日志生成其他日报");
    } catch {
      setError("请求失败，请检查网络或 API 配置。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (report: SavedReport) => {
    downloadReport(report);
    showNotice(`已下载：${buildDownloadFilename(report)}`);
  };

  const handleCopy = async (report: SavedReport) => {
    try {
      await navigator.clipboard.writeText(report.content);
      setCopyHint(report.id);
      showNotice("日报内容已复制到剪贴板");
      window.setTimeout(() => {
        setCopyHint((current) => (current === report.id ? "" : current));
      }, 2000);
    } catch {
      setError("复制失败，请尝试直接下载。");
    }
  };

  const handleDelete = (id: string) => {
    setSavedReports((prev) => {
      const next = prev.filter((report) => report.id !== id);
      setActiveReportId((current) => {
        if (current !== id) return current;
        return next[0]?.id ?? null;
      });
      return next;
    });
  };

  const handleClearAll = () => {
    setSavedReports([]);
    setActiveReportId(null);
    showNotice("已清空全部暂存日报");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* 日志输入 */}
        <section className="dashboard-panel flex min-h-[420px] flex-col lg:min-h-[calc(100vh-280px)]">
          <div className="dashboard-panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <IconTerminal className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-medium text-slate-200">日志输入</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={logInputRef}
                type="file"
                accept=".log,text/plain"
                className="hidden"
                onChange={handleLogFileChange}
              />
              <button
                type="button"
                onClick={() => logInputRef.current?.click()}
                disabled={isLoading}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
              >
                上传 .log
              </button>
              <button
                type="button"
                onClick={handleClearInput}
                disabled={isLoading || (!logs && !logFileName)}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                清空输入
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:text-slate-500"
              >
                {isLoading ? "生成中…" : "生成日报"}
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-center justify-between text-[10px] text-slate-600">
              <span>
                {logLines > 0
                  ? `${logLines} 行 · ${formatBytes(new Blob([logs]).size)}`
                  : "支持粘贴或上传当日运维日志"}
              </span>
              {logFileName && (
                <span className="truncate text-slate-500">{logFileName}</span>
              )}
            </div>

            {(notice || error) && (
              <div
                className={`rounded-md border px-3 py-2 text-xs ${
                  error
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                }`}
                role={error ? "alert" : "status"}
              >
                {error || notice}
              </div>
            )}

            <textarea
              value={logs}
              onChange={(e) => {
                setLogs(e.target.value);
                if (logFileName) setLogFileName(null);
              }}
              onPaste={handlePaste}
              placeholder={
                "# 粘贴或输入当日运维日志\n" +
                "# 可包含：告警记录、巡检结果、故障处理、变更发布等\n" +
                "# 支持 Ctrl+V 粘贴 .log 文件"
              }
              spellCheck={false}
              disabled={isLoading}
              className="log-editor min-h-[280px] flex-1 resize-none rounded-lg p-4 text-sm leading-relaxed text-emerald-50/90 placeholder:text-slate-600 outline-none disabled:opacity-60 lg:min-h-0"
            />

            <p className="text-[10px] text-slate-600">
              生成的日报会自动暂存，可清空输入后继续生成其他日报
            </p>
          </div>
        </section>

        {/* 日报预览 */}
        <section className="dashboard-panel flex min-h-[420px] flex-col lg:min-h-[calc(100vh-280px)]">
          <div className="dashboard-panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <IconDocument className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-medium text-slate-200">
                {activeReport?.title ?? "运维日报"}
              </h2>
            </div>
            {activeReport && !isLoading && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(activeReport)}
                  className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                >
                  {copyHint === activeReport.id ? "已复制" : "复制"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(activeReport)}
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                >
                  下载
                </button>
              </div>
            )}
          </div>

          <div
            role="region"
            aria-live="polite"
            aria-busy={isLoading}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto p-4">
              {!activeReport && !isLoading && (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full border border-slate-700 bg-slate-800/50 p-4">
                    <IconDocument className="h-8 w-8 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">等待日志输入</p>
                  <p className="mt-1 max-w-xs text-xs text-slate-600">
                    输入或上传日志后，点击「生成日报」查看结构化运维日报
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="status-dot status-dot--busy" />
                  正在分析日志并生成日报…
                </div>
              )}

              {activeReport && !isLoading && (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-200">
                  {activeReport.content}
                </pre>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 暂存列表 */}
      <section className="dashboard-panel flex flex-col">
        <div className="dashboard-panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <IconDocument className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-medium text-slate-200">
              已暂存日报
            </h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
              {savedReports.length}
            </span>
          </div>
          {savedReports.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-red-500/30 hover:text-red-400"
            >
              清空全部
            </button>
          )}
        </div>

        {savedReports.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-600">
            暂无暂存日报，生成后会自动保存在此列表（刷新页面后仍保留）
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {savedReports.map((report) => {
              const isActive = report.id === activeReportId;
              return (
                <li
                  key={report.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors ${
                    isActive ? "bg-emerald-500/5" : "hover:bg-slate-800/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveReportId(report.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={`truncate text-sm ${
                        isActive ? "font-medium text-emerald-400" : "text-slate-200"
                      }`}
                    >
                      {report.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatDateTime(report.createdAt)}
                      {report.sourceHint ? ` · ${report.sourceHint}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(report)}
                      className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[10px] font-medium text-slate-300 hover:border-slate-600"
                    >
                      {copyHint === report.id ? "已复制" : "复制"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(report)}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                    >
                      下载
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[10px] font-medium text-slate-400 hover:border-red-500/30 hover:text-red-400"
                    >
                      删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
