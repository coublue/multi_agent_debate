import type { DebateListItem } from "@/lib/types";
import { DebateStatus } from "./debate-status";

type DebateListProps = {
  debates: DebateListItem[];
  onSelectDebate?: (debate: DebateListItem) => void;
  onDeleteDebate?: (debate: DebateListItem) => void;
  deletingDebateId?: number | null;
  emptyMessage?: string;
};

function formatDate(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatWinner(winner?: string | null) {
  if (!winner) {
    return "待判定";
  }

  if (winner === "mixed") {
    return "综合结论";
  }

  if (winner === "balanced") {
    return "均衡结论";
  }

  if (winner === "pro") {
    return "正方";
  }

  if (winner === "con") {
    return "反方";
  }

  return winner;
}

function formatScore(score?: number | null) {
  return typeof score === "number" ? `${score}/100` : "未评分";
}

export function DebateList({
  debates,
  onSelectDebate,
  onDeleteDebate,
  deletingDebateId,
  emptyMessage = "还没有辩论记录。",
}: DebateListProps) {
  if (debates.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/70 px-4 py-10 text-center text-sm leading-6 text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950/70">
      <div className="hidden grid-cols-12 border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-400 md:grid">
        <div className="col-span-4">标题</div>
        <div className="col-span-2">状态</div>
        <div className="col-span-2">可信度</div>
        <div className="col-span-1">结论</div>
        <div className="col-span-2 text-right">创建时间</div>
        <div className="col-span-1 text-right">操作</div>
      </div>

      <div className="divide-y divide-slate-800">
        {debates.map((debate) => {
          const isDeleting = deletingDebateId === debate.id;

          return (
            <div
              className="grid grid-cols-12 gap-3 px-4 py-3 transition hover:bg-slate-900/80"
              key={debate.id}
            >
              <button
                className="col-span-12 min-w-0 text-left outline-none transition hover:text-cyan-200 focus:text-cyan-200 disabled:cursor-not-allowed md:col-span-4"
                disabled={!onSelectDebate || isDeleting}
                onClick={() => onSelectDebate?.(debate)}
                type="button"
              >
                <div className="break-words text-sm font-medium text-slate-100 md:truncate">
                  {debate.title}
                </div>
                <div className="mt-1 text-xs text-slate-500">文章 #{debate.article_id}</div>
              </button>
              <div className="col-span-4 md:col-span-2">
                <DebateStatus status={debate.status} />
              </div>
              <div className="col-span-4 text-sm text-slate-300 md:col-span-2">
                {formatScore(debate.credibility_score)}
              </div>
              <div className="col-span-4 text-sm font-medium text-slate-300 md:col-span-1">
                {formatWinner(debate.winner)}
              </div>
              <div className="col-span-12 text-sm text-slate-500 md:col-span-2 md:text-right">
                {formatDate(debate.created_at)}
              </div>
              <div className="col-span-12 flex justify-end md:col-span-1">
                <button
                  className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/30 bg-rose-500/10 px-3 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
                  disabled={!onDeleteDebate || isDeleting}
                  onClick={() => onDeleteDebate?.(debate)}
                  type="button"
                >
                  {isDeleting ? "删除中" : "删除"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
