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
  text: "Plain Text",
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
        你可以把这段操作流复制给 ChatGPT / DeepSeek / OpenAI，让 AI 帮你复盘仓位变化、加减仓逻辑和操作习惯。
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
        <div className="font-medium text-zinc-800">内置 AI 分析</div>
        <p className="mt-2">内置 AI 分析暂未启用，后续可以接入文本分析 API。</p>
      </div>
    </section>
  );
}
