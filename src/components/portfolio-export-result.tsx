"use client";

import { useState } from "react";
import { CopyTextButton } from "@/components/copy-text-button";
import { type PortfolioExportFormat } from "@/lib/portfolio/export";

type PortfolioExportResultProps = {
  outputs: Record<PortfolioExportFormat, string>;
};

const formatLabels: Record<PortfolioExportFormat, string> = {
  markdown: "Markdown",
  json: "JSON",
  csv: "CSV",
  text: "纯文本",
};

export function PortfolioExportResult({ outputs }: PortfolioExportResultProps) {
  const [format, setFormat] = useState<PortfolioExportFormat>("markdown");
  const currentOutput = outputs[format];

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">导出结果</h2>
          <CopyTextButton
            text={currentOutput}
            idleLabel="复制内容"
            successLabel="复制成功"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {(Object.keys(formatLabels) as PortfolioExportFormat[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFormat(item)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                format === item
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {formatLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 md:p-4">
        <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-zinc-800 md:text-sm">
          {currentOutput}
        </pre>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        已整理为可复制的操作流，适合用于复盘仓位变化和加减仓记录。
      </div>
    </section>
  );
}
