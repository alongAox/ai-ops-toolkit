"use client";

import {
  buildPdfFilename,
  exportAnalysisToPdf,
  type AnalysisPdfContent,
} from "../../lib/export-analysis-pdf";
import { IconDownload } from "./dashboard-icons";
import { useState } from "react";

type ExportPdfButtonProps = AnalysisPdfContent & {
  filenamePrefix: string;
  disabled?: boolean;
  className?: string;
};

export function ExportPdfButton({
  filenamePrefix,
  disabled = false,
  className = "",
  ...content
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const canExport =
    content.userInput.trim().length > 0 || content.aiResult.trim().length > 0;

  const handleExport = async () => {
    if (disabled || isExporting || !canExport) return;

    setIsExporting(true);
    setError("");

    try {
      await exportAnalysisToPdf({
        content,
        filename: buildPdfFilename(filenamePrefix),
      });
    } catch {
      setError("PDF 导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={disabled || isExporting || !canExport}
        className={`inline-flex items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <IconDownload className="h-3.5 w-3.5" />
        {isExporting ? "导出中…" : "导出 PDF"}
      </button>
      {error && (
        <span className="text-[10px] text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
