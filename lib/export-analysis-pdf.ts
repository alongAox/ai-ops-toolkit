export type PdfSection = {
  heading: string;
  body: string;
};

export type AnalysisPdfContent = {
  title: string;
  analysisType: string;
  analyzedAt: Date;
  userInput: string;
  aiResult: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAnalysisTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function buildExportContainer(
  content: AnalysisPdfContent,
  sections: PdfSection[],
  exportedAt: Date
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    "width: 794px",
    "padding: 48px",
    "background: #ffffff",
    "color: #0f172a",
    "font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    "font-size: 14px",
    "line-height: 1.65",
    "box-sizing: border-box",
  ].join(";");

  const sectionsHtml = sections
    .map(
      (section) => `
        <section style="margin-bottom: 28px;">
          <h2 style="margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #047857;">
            ${escapeHtml(section.heading)}
          </h2>
          <pre style="margin: 0; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 13px; color: #1e293b;">${escapeHtml(section.body)}</pre>
        </section>
      `
    )
    .join("");

  container.innerHTML = `
    <header style="margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
      <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">
        AI Analyzer Export
      </p>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">
        ${escapeHtml(content.title)}
      </h1>
      <p style="margin: 12px 0 0; font-size: 14px; color: #334155;">
        <span style="color: #64748b; font-weight: 600;">分析时间</span>
        <span style="margin-left: 8px;">${escapeHtml(formatAnalysisTime(content.analyzedAt))}</span>
      </p>
      <dl style="margin: 16px 0 0; display: grid; grid-template-columns: 96px 1fr; gap: 10px 16px; font-size: 13px;">
        <dt style="margin: 0; color: #64748b; font-weight: 600;">分析类型</dt>
        <dd style="margin: 0; color: #0f172a;">${escapeHtml(content.analysisType)}</dd>
      </dl>
    </header>
    ${sectionsHtml}
    <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
      <span style="color: #64748b; font-weight: 600;">导出时间</span>
      ${escapeHtml(formatAnalysisTime(exportedAt))}
    </footer>
  `;

  return container;
}

export function buildAnalysisPdfSections(
  userInput: string,
  aiResult: string
): PdfSection[] {
  return [
    {
      heading: "用户输入",
      body: userInput.trim() || "（无）",
    },
    {
      heading: "AI 分析结果",
      body: aiResult.trim() || "（无）",
    },
  ];
}

export async function exportAnalysisToPdf(options: {
  content: AnalysisPdfContent;
  filename: string;
}): Promise<void> {
  const sections = buildAnalysisPdfSections(
    options.content.userInput,
    options.content.aiResult
  );

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const exportedAt = new Date();
  const container = buildExportContainer(options.content, sections, exportedAt);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png", 1.0);

    let heightLeft = imgHeight;
    let y = margin;

    pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      y = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }

    const safeName = options.filename.replace(/[<>"/\\|?*]+/g, "-");
    pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export function buildPdfFilename(prefix: string): string {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const timePart = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
  return `${prefix}-${datePart}-${timePart}.pdf`;
}
