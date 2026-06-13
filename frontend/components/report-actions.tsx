"use client";

import { useMemo, useState } from "react";

import { buildDebateMarkdownFilename, generateDebateMarkdown } from "@/lib/report";
import type { DebateDetailRead } from "@/lib/types";

type ReportActionsProps = {
  debate: DebateDetailRead;
};

export function ReportActions({ debate }: ReportActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const markdown = useMemo(() => generateDebateMarkdown(debate), [debate]);
  const filename = useMemo(() => buildDebateMarkdownFilename(debate), [debate]);

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-violet-400/60 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-950"
        onClick={handleDownload}
        type="button"
      >
        导出 Markdown
      </button>
      <button
        className="rounded-md bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 focus:ring-offset-slate-950"
        onClick={handleCopy}
        type="button"
      >
        {copyState === "copied" ? "已复制" : "复制 Markdown"}
      </button>
      {copyState === "failed" ? (
        <span className="text-xs font-medium text-rose-300">
          复制失败，请检查浏览器剪贴板权限。
        </span>
      ) : null}
    </div>
  );
}
