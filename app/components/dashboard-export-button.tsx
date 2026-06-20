"use client";

import { exportDashboardStatsToPdf } from "../../lib/export-dashboard-stats-pdf";
import type { AnalysisRecord, AnalysisStats } from "../../lib/analysis-records";
import { IconDownload } from "./dashboard-icons";
import { useState } from "react";

type DashboardExportButtonProps = {
  stats: AnalysisStats | null;
  recentRecords: AnalysisRecord[];
  disabled?: boolean;
  className?: string;
};

export function DashboardExportButton({
  stats,
  recentRecords,
  disabled = false,
  className = "",
}: DashboardExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (disabled || isExporting || !stats) return;

    setIsExporting(true);
    setError("");

    try {
      await exportDashboardStatsToPdf({ stats, recentRecords });
    } catch {
      setError("导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={disabled || isExporting || !stats}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <IconDownload className="h-3.5 w-3.5" />
        {isExporting ? "导出中…" : "导出统计报告"}
      </button>
      {error && (
        <span className="text-[10px] text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
