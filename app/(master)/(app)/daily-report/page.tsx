"use client";

import { DailyReportGenerator } from "../../../components/daily-report-generator";

export default function DailyReportPage() {
  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0b0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              日报生成器
            </h1>
            <p className="text-[11px] text-slate-500">自动生成运维日报与工作总结</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-4 lg:p-6">
        <DailyReportGenerator />
      </main>
    </div>
  );
}
