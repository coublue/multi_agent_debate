import type { DebateStatus as DebateStatusValue } from "@/lib/types";

type DebateStatusProps = {
  status: DebateStatusValue;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  running: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "排队中",
  running: "辩论中",
  completed: "已完成",
  failed: "失败",
};

export function DebateStatus({ status, className = "" }: DebateStatusProps) {
  const key = String(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[key] ?? "border-slate-700 bg-slate-800 text-slate-300",
        className,
      ].join(" ")}
    >
      {STATUS_LABELS[key] ?? key}
    </span>
  );
}
