"use client";

import {
  IconActivity,
  IconChart,
  IconShield,
  IconTerminal,
} from "../../../components/dashboard-icons";
import {
  buildAiResultFromMessages,
  buildLogAnalyzerUserInput,
  formatRecordTime,
  LOG_ANALYZER_TYPE,
  recordInputPreview,
  saveAnalysisRecord,
  type AnalysisRecord,
} from "../../../../lib/analysis-records";
import { useCallback, useEffect, useRef, useState } from "react";

type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MAX_LOG_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 5;

const PLATFORMS = [
  { name: "Kubernetes", color: "text-blue-400" },
  { name: "MySQL", color: "text-amber-400" },
  { name: "Kafka", color: "text-purple-400" },
  { name: "Nginx", color: "text-emerald-400" },
  { name: "Redis", color: "text-red-400" },
  { name: "Docker", color: "text-sky-400" },
];

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "UTF-8");
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function isLogFile(file: File): boolean {
  if (isImageFile(file)) return false;
  return (
    file.name.toLowerCase().endsWith(".log") ||
    file.type === "text/plain" ||
    file.type === "application/octet-stream" ||
    file.type === ""
  );
}

function imageFileName(file: File, index: number): string {
  if (file.name) return file.name;
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  return `pasted-image-${Date.now()}-${index + 1}.${ext}`;
}

function collectClipboardFiles(data: DataTransfer): File[] {
  const result: File[] = [];
  const keys = new Set<string>();

  const add = (file: File | null) => {
    if (!file) return;
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (keys.has(key)) return;
    keys.add(key);
    result.push(file);
  };

  for (const file of Array.from(data.files)) add(file);
  for (const item of Array.from(data.items)) {
    if (item.kind === "file") add(item.getAsFile());
  }
  return result;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function LogAnalyzerPage() {
  const [logs, setLogs] = useState("");
  const [logFileName, setLogFileName] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedRecords, setSavedRecords] = useState<AnalysisRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);

  const logInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasAnalysis = chatMessages.length > 0;
  const canAnalyze = !isLoading && (logs.trim().length > 0 || images.length > 0);
  const canFollowUp = !isLoading && hasAnalysis && followUpInput.trim().length > 0;
  const canSaveRecord =
    !isLoading &&
    !isSaving &&
    hasAnalysis &&
    supabaseReady !== false &&
    (logs.trim().length > 0 || images.length > 0);

  const logLines = logs.trim() ? logs.split("\n").length : 0;
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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoading]);

  const fetchSavedRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const response = await fetch(
        `/api/analysis-records?type=${encodeURIComponent(LOG_ANALYZER_TYPE)}&limit=20`
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503) {
          setSupabaseReady(false);
        }
        if (response.status === 401) {
          setError("请先登录后再查看记录。");
        }
        return;
      }
      setSupabaseReady(true);
      setSavedRecords(Array.isArray(data.records) ? data.records : []);
    } catch {
      setSupabaseReady(false);
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    void fetchSavedRecords();
  }, [fetchSavedRecords]);

  const showNotice = (message: string) => {
    setNotice(message);
    setError("");
  };

  const importLogFile = async (file: File, source = "上传") => {
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
      setLogFileName(file.name || `${source}的日志`);
      showNotice(`已加载：${file.name || "未命名.log"}`);
    } catch {
      setError("读取日志文件失败，请确认文件编码为 UTF-8。");
    }
  };

  const importImageFiles = async (
    files: File[],
    source = "上传",
    currentCount = images.length
  ) => {
    if (files.length === 0) return;
    if (currentCount + files.length > MAX_IMAGES) {
      setError(`最多添加 ${MAX_IMAGES} 张图片。`);
      return;
    }
    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isImageFile(file)) {
        setError(`「${file.name || "未知文件"}」不是支持的图片格式。`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`「${file.name || "未知文件"}」超过 10 MB。`);
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newImages.push({
          id: crypto.randomUUID(),
          name: imageFileName(file, i),
          dataUrl,
        });
      } catch {
        setError(`读取图片「${file.name || "未知文件"}」失败。`);
        return;
      }
    }
    setImages((prev) => [...prev, ...newImages]);
    showNotice(`已添加图片 ${newImages.length} 张`);
  };

  const handleLogFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await importLogFile(file, "上传");
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) await importImageFiles(files, "上传");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isLoading) return;
    const clipboardFiles = collectClipboardFiles(e.clipboardData);
    const imageFiles = clipboardFiles.filter(isImageFile);
    const logFiles = clipboardFiles.filter(isLogFile);
    if (imageFiles.length > 0) {
      e.preventDefault();
      void importImageFiles(imageFiles, "粘贴");
      return;
    }
    if (logFiles.length > 0) {
      e.preventDefault();
      void importLogFile(logFiles[0], "粘贴");
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setIsLoading(true);
    setChatMessages([]);
    setFollowUpInput("");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          logs: logs.trim() || undefined,
          images: images.map(({ name, dataUrl }) => ({ name, dataUrl })),
        }),
      });
      const data = await response.json();
      setChatMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content ?? "未收到分析结果。",
        },
      ]);
    } catch {
      setChatMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "请求失败，请检查网络或 API 配置。",
        },
      ]);
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
          mode: "followup",
          logs: logs.trim() || undefined,
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
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "请求失败，请检查网络或 API 配置。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleFollowUp();
    }
  };

  const handleSaveRecord = async () => {
    if (!canSaveRecord) return;
    setIsSaving(true);
    setError("");
    const result = await saveAnalysisRecord({
      analysisType: LOG_ANALYZER_TYPE,
      userInput: buildLogAnalyzerUserInput(logs, {
        logFileName,
        imageNames: images.map((img) => img.name),
      }),
      aiResult: buildAiResultFromMessages(chatMessages),
    });
    if (!result.ok) {
      setError(result.error);
      if (result.status === 503) {
        setSupabaseReady(false);
      }
    } else {
      setSupabaseReady(true);
      setSavedRecords((prev) => [result.record, ...prev].slice(0, 20));
      showNotice("分析记录已保存");
    }
    setIsSaving(false);
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const response = await fetch(
        `/api/analysis-records?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "删除记录失败。");
        return;
      }
      setSavedRecords((prev) => prev.filter((record) => record.id !== id));
      if (expandedRecordId === id) {
        setExpandedRecordId(null);
      }
      showNotice("记录已删除");
    } catch {
      setError("删除失败，请检查网络。");
    }
  };

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              日志分析器
            </h1>
            <p className="text-[11px] text-slate-500">智能日志分析与故障诊断</p>
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
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {isLoading && !hasAnalysis
                ? "分析中…"
                : hasAnalysis
                  ? "重新分析"
                  : "开始分析"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 lg:gap-6">
        {/* 侧边栏 */}
        <aside className="hidden w-52 shrink-0 border-r border-slate-800/60 p-4 lg:block">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            支持平台
          </p>
          <ul className="space-y-1.5">
            {PLATFORMS.map((p) => (
              <li
                key={p.name}
                className="platform-tag flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-400"
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-current ${p.color}`} />
                {p.name}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
              输出维度
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
              <li>· 错误原因</li>
              <li>· 业务影响</li>
              <li>· 修复建议</li>
              <li>· 风险等级</li>
            </ul>
          </div>
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                分析记录
              </p>
              <button
                type="button"
                onClick={() => void fetchSavedRecords()}
                disabled={isLoadingRecords}
                className="text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-50"
              >
                {isLoadingRecords ? "刷新中…" : "刷新"}
              </button>
            </div>

            {supabaseReady === false ? (
              <p className="text-[11px] leading-relaxed text-slate-500">
                未配置 Supabase。请在 .env.local 填入密钥并执行建表 SQL。
              </p>
            ) : savedRecords.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {isLoadingRecords ? "加载中…" : "暂无保存记录"}
              </p>
            ) : (
              <ul className="max-h-[320px] space-y-2 overflow-y-auto">
                {savedRecords.map((record) => {
                  const expanded = expandedRecordId === record.id;
                  return (
                    <li
                      key={record.id}
                      className="rounded-md border border-slate-800 bg-[#080c10] p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRecordId(expanded ? null : record.id)
                        }
                        className="w-full text-left"
                      >
                        <p className="truncate font-mono text-[11px] text-emerald-100/90">
                          {recordInputPreview(record.input_content)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-600">
                          {formatRecordTime(record.created_at)} · 日志分析
                        </p>
                      </button>
                      {expanded && (
                        <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                          <div>
                            <p className="mb-1 text-[10px] font-medium text-slate-500">
                              用户输入
                            </p>
                            <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded bg-slate-900/60 p-2 text-[10px] text-slate-400">
                              {record.input_content}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-medium text-slate-500">
                              AI 结果
                            </p>
                            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded bg-slate-900/60 p-2 text-[10px] text-slate-400">
                              {record.result}
                            </pre>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRecord(record.id)}
                            className="text-[10px] text-red-400/80 hover:text-red-400"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* 主内容 */}
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="日志行数"
              value={String(logLines)}
              sub={logFileName ?? (logs.trim() ? "已输入文本" : "暂无数据")}
              icon={<IconTerminal className="h-4 w-4" />}
            />
            <StatCard
              label="数据大小"
              value={formatBytes(new Blob([logs]).size)}
              sub={`${images.length} 张附件`}
              icon={<IconChart className="h-4 w-4" />}
            />
            <StatCard
              label="对话轮次"
              value={String(chatMessages.length)}
              sub={hasAnalysis ? "可继续追问" : "等待分析"}
              icon={<IconActivity className="h-4 w-4" />}
            />
            <StatCard
              label="会话状态"
              value={statusLabel}
              sub="AI 驱动分析"
              icon={<IconShield className="h-4 w-4" />}
            />
          </div>

          {/* 双栏面板 */}
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {/* 日志输入 */}
            <section className="dashboard-panel flex min-h-[420px] flex-col lg:min-h-[calc(100vh-220px)]">
              <div className="dashboard-panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <IconTerminal className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm font-medium text-slate-200">日志输入</h2>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={logInputRef}
                    type="file"
                    accept=".log,text/plain"
                    className="hidden"
                    onChange={handleLogFileChange}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => logInputRef.current?.click()}
                    disabled={isLoading}
                    className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
                  >
                    .log 文件
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isLoading || images.length >= MAX_IMAGES}
                    className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
                  >
                    图片
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="group relative overflow-hidden rounded-md border border-slate-700"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="h-14 w-14 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}

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
                  id="log-input"
                  value={logs}
                  onChange={(e) => {
                    setLogs(e.target.value);
                    if (logFileName) setLogFileName(null);
                  }}
                  onPaste={handlePaste}
                  placeholder={"# 粘贴或输入日志内容\n# 支持 Ctrl+V 粘贴截图 / .log 文件\n# 例：ERROR、CrashLoopBackOff、ORA-12154…"}
                  spellCheck={false}
                  className="log-editor min-h-[280px] flex-1 resize-none rounded-lg p-4 text-sm leading-relaxed text-emerald-50/90 placeholder:text-slate-600 outline-none lg:min-h-0"
                />

                <p className="text-[10px] text-slate-600">
                  终端风格输入 · 支持多行日志与堆栈跟踪
                </p>
              </div>
            </section>

            {/* 分析报告 */}
            <section className="dashboard-panel flex min-h-[420px] flex-col lg:min-h-[calc(100vh-220px)]">
              <div className="dashboard-panel-header flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <IconChart className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm font-medium text-slate-200">
                    分析报告与对话
                  </h2>
                </div>
                {hasAnalysis && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    已生成
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
                        <IconShield className="h-8 w-8 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">等待日志输入</p>
                      <p className="mt-1 max-w-xs text-xs text-slate-600">
                        分析完成后将在此展示结构化报告，并支持继续追问
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
                              Analysis Report
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
                      {hasAnalysis ? "AI 正在思考…" : "正在分析日志…"}
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
                        placeholder="追问：例如「风险等级为高是什么意思？」"
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
    </div>
  );
}
