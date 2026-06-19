"use client";

import { IconHistory } from "../../../components/dashboard-icons";
import {
  extractRecordName,
  extractRecordTitle,
  formatRecordDateGroupLabel,
  formatRecordTime,
  getAnalysisTypeLabel,
  getInputContentLabel,
  getResultContentLabel,
  groupRecordsByDate,
  type AnalysisRecord,
} from "../../../../lib/analysis-records";
import { useCallback, useEffect, useState } from "react";

export default function HistoryPage() {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analysis-records?limit=100");
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          setSupabaseReady(false);
        }
        if (response.status === 401) {
          setError("请先登录后再查看历史记录。");
        } else {
          setError(data.error ?? "加载历史记录失败。");
        }
        setRecords([]);
        return;
      }

      setSupabaseReady(true);
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch {
      setSupabaseReady(false);
      setError("加载失败，请检查网络或 Supabase 配置。");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const groupedRecords = groupRecordsByDate(records);

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              历史记录
            </h1>
            <p className="text-[11px] text-slate-500">
              查看已保存的分析记录
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchRecords()}
            disabled={isLoading}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 lg:p-6">
        {error && (
          <div
            className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        {isLoading && records.length === 0 && (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <span className="status-dot status-dot--busy mb-3" />
            <p className="text-sm text-slate-500">正在加载历史记录…</p>
          </div>
        )}

        {!isLoading && supabaseReady === false && !error && (
          <div className="dashboard-panel flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <IconHistory className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">Supabase 未配置</p>
            <p className="mt-2 max-w-md text-xs text-slate-600">
              请在 .env.local 配置 Supabase，并在各功能页完成分析后点击「保存记录」。
            </p>
          </div>
        )}

        {!isLoading && records.length === 0 && supabaseReady !== false && !error && (
          <div className="dashboard-panel flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <IconHistory className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">暂无历史记录</p>
            <p className="mt-2 max-w-md text-xs text-slate-600">
              在日志分析器、Error Explainer 或日报生成器中保存记录后，可在此查看。
            </p>
          </div>
        )}

        {groupedRecords.length > 0 && (
          <div className="space-y-8">
            {groupedRecords.map(({ date, records: dateRecords }) => (
              <section key={date}>
                <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100">
                  {formatRecordDateGroupLabel(date)}
                </h2>

                <ul className="space-y-4">
                  {dateRecords.map((record) => {
                    const expanded = expandedId === record.id;
                    const recordTitle = extractRecordTitle(record);
                    const recordName = extractRecordName(record);

                    return (
                      <li
                        key={record.id}
                        className="dashboard-panel overflow-hidden"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                                {getAnalysisTypeLabel(record.analysis_type)}
                              </span>
                              {recordName && (
                                <span className="shrink-0 font-mono text-xs font-medium text-amber-400/90">
                                  {recordName}
                                </span>
                              )}
                            </div>
                            <p className="mt-3 text-base font-medium text-slate-100">
                              {recordTitle}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600">
                              {formatRecordTime(record.created_at)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : record.id)
                            }
                            className="shrink-0 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
                          >
                            {expanded ? "收起详情" : "查看详情"}
                          </button>
                        </div>

                        {expanded && (
                          <div className="space-y-4 border-t border-slate-800 bg-[#080c10]/60 px-4 py-4 sm:px-5">
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {getInputContentLabel(record.analysis_type)}
                              </h3>
                              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-[#080c10] p-4 text-sm leading-relaxed text-amber-50/90">
                                {record.input_content}
                              </pre>
                            </div>
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {getResultContentLabel(record.analysis_type)}
                              </h3>
                              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm leading-relaxed text-slate-200">
                                {record.result}
                              </pre>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
