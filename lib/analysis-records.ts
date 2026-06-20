export const LOG_ANALYZER_TYPE = "log-analyzer";
export const ERROR_EXPLAINER_TYPE = "error-explainer";
export const DAILY_REPORT_TYPE = "daily-report";

type ChatMessageLike = {
  role: "user" | "assistant";
  content: string;
};

export type AnalysisRecord = {
  id: string;
  analysis_type: string;
  input_content: string;
  result: string;
  created_at: string;
};

export type AnalysisStats = {
  total: number;
  logAnalyzer: number;
  errorExplainer: number;
  dailyReport: number;
};

export function buildLogAnalyzerUserInput(
  logs: string,
  options?: {
    logFileName?: string | null;
    imageNames?: string[];
  }
): string {
  const parts: string[] = [];

  if (options?.logFileName) {
    parts.push(`[文件: ${options.logFileName}]`);
  }

  const text = logs.trim();
  if (text) {
    parts.push(text);
  }

  if (options?.imageNames && options.imageNames.length > 0) {
    parts.push(`[图片附件: ${options.imageNames.join(", ")}]`);
  }

  return parts.join("\n\n");
}

export function buildErrorExplainerUserInput(errorText: string): string {
  return errorText.trim();
}

export function buildDailyReportUserInput(
  logs: string,
  options?: {
    logFileName?: string | null;
    sourceHint?: string;
  }
): string {
  const parts: string[] = [];

  if (options?.sourceHint) {
    parts.push(`[来源: ${options.sourceHint}]`);
  }

  if (options?.logFileName) {
    parts.push(`[文件: ${options.logFileName}]`);
  }

  const text = logs.trim();
  if (text) {
    parts.push(text);
  }

  return parts.join("\n\n");
}

export type SaveAnalysisRecordResult =
  | { ok: true; record: AnalysisRecord }
  | { ok: false; error: string; status?: number };

export async function saveAnalysisRecord(params: {
  analysisType: string;
  userInput: string;
  aiResult: string;
}): Promise<SaveAnalysisRecordResult> {
  try {
    const response = await fetch("/api/analysis-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisType: params.analysisType,
        userInput: params.userInput,
        aiResult: params.aiResult,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? "保存分析记录失败。",
        status: response.status,
      };
    }

    return { ok: true, record: data.record as AnalysisRecord };
  } catch {
    return { ok: false, error: "保存失败，请检查网络或 Supabase 配置。" };
  }
}

export async function updateAnalysisRecord(params: {
  id: string;
  userInput?: string;
  aiResult: string;
}): Promise<SaveAnalysisRecordResult> {
  try {
    const response = await fetch("/api/analysis-records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.id,
        userInput: params.userInput,
        aiResult: params.aiResult,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? "更新分析记录失败。",
        status: response.status,
      };
    }

    return { ok: true, record: data.record as AnalysisRecord };
  } catch {
    return { ok: false, error: "更新失败，请检查网络或 Supabase 配置。" };
  }
}

/** 首次分析创建记录，追问后更新同一条记录（静默失败，不阻断主流程） */
export async function syncAnalysisRecord(params: {
  recordId?: string | null;
  analysisType: string;
  userInput: string;
  aiResult: string;
}): Promise<string | null> {
  if (!params.userInput.trim() || !params.aiResult.trim()) {
    return params.recordId ?? null;
  }

  if (params.recordId) {
    const updated = await updateAnalysisRecord({
      id: params.recordId,
      userInput: params.userInput,
      aiResult: params.aiResult,
    });
    return updated.ok ? updated.record.id : params.recordId;
  }

  const created = await saveAnalysisRecord({
    analysisType: params.analysisType,
    userInput: params.userInput,
    aiResult: params.aiResult,
  });
  return created.ok ? created.record.id : null;
}

export function buildAiResultFromMessages(messages: ChatMessageLike[]): string {
  let followUpIndex = 0;

  return messages
    .map((message, index) => {
      let label: string;
      if (message.role === "user") {
        followUpIndex += 1;
        label = `用户追问 ${followUpIndex}`;
      } else {
        label = index === 0 ? "AI 初次分析" : `AI 回复 ${followUpIndex || 1}`;
      }
      return `## ${label}\n\n${message.content.trim()}`;
    })
    .join("\n\n---\n\n");
}

export function formatRecordDate(iso: string): string {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 统一以 UTC 显示，如 2026/06/15 06:30:00 UTC */
export function formatDateTimeWithTimeZone(iso: string): string {
  const date = new Date(iso);
  const datetime = date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${datetime} UTC`;
}

/** 历史页日期分组标题，如 2026-06-15 UTC */
export function formatRecordDateGroupLabel(dateKey: string): string {
  return `${dateKey} UTC`;
}

export function getAnalysisTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "log-analyzer": "日志分析",
    "error-explainer": "错误解释",
    "daily-report": "日报生成",
  };
  return labels[type] ?? type;
}

export function groupRecordsByDate(
  records: AnalysisRecord[]
): { date: string; records: AnalysisRecord[] }[] {
  const groups = new Map<string, AnalysisRecord[]>();

  for (const record of records) {
    const date = formatRecordDate(record.created_at);
    const list = groups.get(date);
    if (list) {
      list.push(record);
    } else {
      groups.set(date, [record]);
    }
  }

  return Array.from(groups.entries()).map(([date, dateRecords]) => ({
    date,
    records: dateRecords,
  }));
}

export function formatRecordTime(iso: string): string {
  return formatDateTimeWithTimeZone(iso);
}

export function extractLogErrorTitle(result: string, inputContent: string): string {
  const directCause = result.match(/\*\*直接原因\*\*[：:]\s*(.+)/);
  if (directCause?.[1]?.trim()) {
    return directCause[1].trim().replace(/\*\*/g, "").slice(0, 80);
  }

  const logType = result.match(/##\s*日志类型\s*\n+([^\n#]+)/);
  if (logType?.[1]?.trim()) {
    return logType[1].trim();
  }

  return recordInputPreview(inputContent, 64);
}

export function extractLogErrorName(
  result: string,
  inputContent: string
): string | null {
  const haystack = `${inputContent}\n${result}`;

  const patterns: RegExp[] = [
    /\b(ORA-\d{4,5})\b/i,
    /\b(CrashLoopBackOff|ImagePullBackOff|OOMKilled|ErrImagePull|Evicted)\b/,
    /\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNRESET)\b/,
    /\bHTTP\s*([45]\d{2})\b/i,
    /connection refused/i,
    /\*\*关联错误码\/关键字说明\*\*[：:]\s*(.+)/,
  ];

  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match) {
      const value = (match[1] ?? match[0]).trim();
      if (value) return value.replace(/\*\*/g, "").slice(0, 48);
    }
  }

  const firstLine = inputContent
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("["));

  if (firstLine && firstLine.length <= 32) {
    return firstLine;
  }

  return null;
}

export function extractErrorExplainerTitle(
  result: string,
  inputContent: string
): string {
  const oneLine = result.match(/\*\*一句话解释\*\*[：:]\s*(.+)/);
  if (oneLine?.[1]?.trim()) {
    return oneLine[1].trim().replace(/\*\*/g, "").slice(0, 80);
  }

  const tech = result.match(/\*\*技术说明\*\*[：:]\s*(.+)/);
  if (tech?.[1]?.trim()) {
    return tech[1].trim().replace(/\*\*/g, "").slice(0, 80);
  }

  return recordInputPreview(inputContent, 64);
}

export function extractDailyReportTitle(
  result: string,
  inputContent: string
): string {
  const heading = result.match(/^##\s+(.+)$/m);
  if (heading?.[1]?.trim()) {
    return heading[1].trim().slice(0, 80);
  }

  const firstLine = result.trim().split("\n").find((line) => line.trim());
  if (firstLine && !firstLine.startsWith("#")) {
    return firstLine.trim().slice(0, 80);
  }

  return recordInputPreview(inputContent, 64);
}

function countAlertEventTableRows(section: string): number {
  if (/今日无告警|无告警记录|暂无相关/.test(section)) {
    return 0;
  }

  const lines = section.split("\n");
  let passedSeparator = false;
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
      passedSeparator = true;
      continue;
    }
    if (/今日无|无告警|暂无相关/.test(trimmed)) continue;

    if (passedSeparator) {
      count += 1;
    }
  }

  return count;
}

/** 从日报正文「2. 告警与事件」表格统计条目数 */
export function extractDailyReportFaultCount(result: string): number {
  const alertSection = result.match(
    /##\s*2\.\s*告警与事件\s*([\s\S]*?)(?=##\s|$)/
  );

  if (!alertSection) {
    return 0;
  }

  return countAlertEventTableRows(alertSection[1]);
}

export function extractDailyReportFaultLabel(result: string): string {
  const count = extractDailyReportFaultCount(result);
  return `${count} 条故障`;
}

export function extractRecordTitle(record: AnalysisRecord): string {
  switch (record.analysis_type) {
    case LOG_ANALYZER_TYPE:
      return extractLogErrorTitle(record.result, record.input_content);
    case ERROR_EXPLAINER_TYPE:
      return extractErrorExplainerTitle(record.result, record.input_content);
    case DAILY_REPORT_TYPE:
      return extractDailyReportTitle(record.result, record.input_content);
    default:
      return recordInputPreview(record.input_content, 64);
  }
}

export function extractRecordName(record: AnalysisRecord): string | null {
  switch (record.analysis_type) {
    case LOG_ANALYZER_TYPE:
    case ERROR_EXPLAINER_TYPE:
      return extractLogErrorName(record.result, record.input_content);
    case DAILY_REPORT_TYPE:
      return extractDailyReportFaultLabel(record.result);
    default:
      return null;
  }
}

export function getInputContentLabel(type: string): string {
  switch (type) {
    case LOG_ANALYZER_TYPE:
      return "原始日志";
    case ERROR_EXPLAINER_TYPE:
      return "原始错误";
    case DAILY_REPORT_TYPE:
      return "原始输入";
    default:
      return "用户输入";
  }
}

export function getResultContentLabel(type: string): string {
  switch (type) {
    case LOG_ANALYZER_TYPE:
    case ERROR_EXPLAINER_TYPE:
      return "完整过程（含追问）";
    case DAILY_REPORT_TYPE:
      return "日报内容";
    default:
      return "分析结果";
  }
}

export function recordInputPreview(text: string, max = 48): string {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line;
}
