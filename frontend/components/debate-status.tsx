import type { DebateStatus as DebateStatusValue } from "@/lib/types";

type DebateStatusProps = {
  status: DebateStatusValue;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
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
        STATUS_STYLES[key] ?? "border-slate-200 bg-white text-slate-700",
        className,
      ].join(" ")}
    >
      {STATUS_LABELS[key] ?? key}
    </span>
  );
}
