"use client";

import {
  AnalysisPieChart,
  type PieSlice,
} from "../../../components/analysis-pie-chart";
import {
  IconAlert,
  IconChart,
  IconDocument,
  IconHistory,
  IconTerminal,
} from "../../../components/dashboard-icons";
import {
  extractRecordTitle,
  formatRecordDate,
  getAnalysisTypeLabel,
  type AnalysisRecord,
  type AnalysisStats,
} from "../../../../lib/analysis-records";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type StatCard = {
  label: string;
  value: keyof AnalysisStats;
  icon: typeof IconChart;
  accent: string;
  border: string;
  barColor: string;
  href?: string;
};

const STAT_CARDS: StatCard[] = [
  {
    label: "总分析次数",
    value: "total",
    icon: IconChart,
    accent: "text-emerald-400",
    border: "border-emerald-500/30 bg-emerald-500/10",
    barColor: "bg-emerald-500",
  },
  {
    label: "日志分析",
    value: "logAnalyzer",
    icon: IconTerminal,
    accent: "text-sky-400",
    border: "border-sky-500/30 bg-sky-500/10",
    barColor: "bg-sky-500",
    href: "/log-analyzer",
  },
  {
    label: "日报生成",
    value: "dailyReport",
    icon: IconDocument,
    accent: "text-violet-400",
    border: "border-violet-500/30 bg-violet-500/10",
    barColor: "bg-violet-500",
    href: "/daily-report",
  },
  {
    label: "错误解释",
    value: "errorExplainer",
    icon: IconAlert,
    accent: "text-amber-400",
    border: "border-amber-500/30 bg-amber-500/10",
    barColor: "bg-amber-500",
    href: "/error-explainer",
  },
];

const PIE_COLORS = {
  logAnalyzer: "#38bdf8",
  dailyReport: "#a78bfa",
  errorExplainer: "#fbbf24",
};

const QUICK_LINKS = [
  { href: "/log-analyzer", label: "Log Analyzer", icon: IconTerminal },
  { href: "/error-explainer", label: "Error Explainer", icon: IconAlert },
  { href: "/daily-report", label: "Daily Report", icon: IconDocument },
  { href: "/history", label: "History", icon: IconHistory },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsRes, recordsRes] = await Promise.all([
        fetch("/api/analysis-records/stats"),
        fetch("/api/analysis-records?limit=5"),
      ]);
      const statsData = await statsRes.json();
      const recordsData = await recordsRes.json();

      if (!statsRes.ok) {
        if (statsRes.status === 503) {
          setSupabaseReady(false);
        }
        if (statsRes.status === 401) {
          setError("请先登录后再查看 Dashboard。");
        } else {
          setError(statsData.error ?? "加载统计数据失败。");
        }
        setStats(null);
        setRecentRecords([]);
        return;
      }

      setSupabaseReady(true);
      setStats(statsData.stats as AnalysisStats);
      setRecentRecords(
        recordsRes.ok && Array.isArray(recordsData.records)
          ? recordsData.records
          : []
      );
    } catch {
      setSupabaseReady(false);
      setError("加载失败，请检查网络或 Supabase 配置。");
      setStats(null);
      setRecentRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const pieSlices: PieSlice[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "日志分析",
        value: stats.logAnalyzer,
        color: PIE_COLORS.logAnalyzer,
      },
      {
        label: "日报生成",
        value: stats.dailyReport,
        color: PIE_COLORS.dailyReport,
      },
      {
        label: "错误解释",
        value: stats.errorExplainer,
        color: PIE_COLORS.errorExplainer,
      },
    ];
  }, [stats]);

  const breakdownItems = STAT_CARDS.filter((card) => card.value !== "total");

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              Dashboard
            </h1>
            <p className="text-[11px] text-slate-500">Supabase 数据概览</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchDashboard()}
            disabled={isLoading}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 lg:p-6">
        {error && (
          <div
            className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        {isLoading && !stats && (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <span className="status-dot status-dot--busy mb-3" />
            <p className="text-sm text-slate-500">正在加载 Dashboard…</p>
          </div>
        )}

        {!isLoading && supabaseReady === false && !error && (
          <div className="dashboard-panel flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <IconChart className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">Supabase not configured</p>
            <p className="mt-2 max-w-md text-xs text-slate-600">
              Configure Supabase and save analysis records from feature pages to
              see stats here.
            </p>
          </div>
        )}

        {stats && (
          <>
            <section className="dashboard-panel overflow-hidden">
              <div className="relative border-b border-slate-800/80 bg-gradient-to-r from-emerald-500/10 via-transparent to-violet-500/10 px-5 py-6 sm:px-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08),transparent_50%)]" />
                <div className="relative flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/80">
                      Ops Intelligence
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
                      分析概览
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Supabase 已保存记录 · 共{" "}
                      <span className="font-medium text-emerald-400">
                        {stats.total.toLocaleString("zh-CN")} 条
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5">
                    <span className="status-dot status-dot--live" />
                    <span className="text-xs text-emerald-400">Supabase 实时同步</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {STAT_CARDS.map(({ label, value, icon: Icon, accent, border, href }) => {
                const content = (
                  <>
                    <div
                      className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg border ${border}`}
                    >
                      <Icon className={`h-5 w-5 ${accent}`} />
                    </div>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>
                      {stats[value].toLocaleString("zh-CN")}
                    </p>
                  </>
                );

                if (href) {
                  return (
                    <Link
                      key={value}
                      href={href}
                      className="stat-card block p-5"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={value} className="stat-card p-5">
                    {content}
                  </div>
                );
              })}
            </section>

            <section className="grid gap-6 lg:grid-cols-5">
              <div className="dashboard-panel lg:col-span-3">
                <div className="dashboard-panel-header px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-100">
                    类型分布
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    扇形图 · 按分析类型统计
                  </p>
                </div>
                <div className="flex min-h-[320px] items-center justify-center p-6">
                  <AnalysisPieChart slices={pieSlices} total={stats.total} size={260} />
                </div>
              </div>

              <div className="dashboard-panel lg:col-span-2">
                <div className="dashboard-panel-header px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-100">
                    占比明细
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    各类型占总量比例
                  </p>
                </div>
                <div className="space-y-5 p-5">
                  {breakdownItems.map(({ label, value, accent, barColor }) => {
                    const count = stats[value];
                    const percent =
                      stats.total > 0
                        ? Math.round((count / stats.total) * 100)
                        : 0;
                    return (
                      <div key={value}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400">{label}</span>
                          <span className={`font-semibold ${accent}`}>
                            {count} · {percent}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="dashboard-panel">
                <div className="dashboard-panel-header flex items-center justify-between px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      最近 5 条分析
                    </h3>
                    <p className="text-[11px] text-slate-500">最新保存的记录</p>
                  </div>
                  <Link
                    href="/history"
                    className="text-xs font-medium text-emerald-400 hover:underline"
                  >
                    查看全部
                  </Link>
                </div>
                <ul className="divide-y divide-slate-800/80">
                  {recentRecords.length === 0 ? (
                    <li className="px-5 py-8 text-center text-sm text-slate-500">
                      暂无保存的分析记录
                    </li>
                  ) : (
                    recentRecords.map((record) => (
                      <li key={record.id} className="px-5 py-5">
                        <p className="text-sm font-medium tracking-tight text-slate-400">
                          {formatRecordDate(record.created_at)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-emerald-400/90">
                          {getAnalysisTypeLabel(record.analysis_type)}
                        </p>
                        <p className="mt-1.5 text-base font-medium leading-snug text-slate-100">
                          {extractRecordTitle(record)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="dashboard-panel">
                <div className="dashboard-panel-header px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Quick Actions
                  </h3>
                  <p className="text-[11px] text-slate-500">快捷跳转功能页</p>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#080c10]/60 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-300"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {stats.total === 0 && supabaseReady && (
              <p className="text-center text-sm text-slate-500">
                在{" "}
                <Link href="/log-analyzer" className="text-emerald-400 hover:underline">
                  Log Analyzer
                </Link>{" "}
                等功能页保存记录后，数据将显示在此。
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
