import type { ArticleListItem } from "@/lib/types";

type ArticleListProps = {
  articles: ArticleListItem[];
  deletingArticleId?: number | null;
  emptyMessage?: string;
  onDeleteArticle?: (article: ArticleListItem) => void;
  onSelectArticle?: (article: ArticleListItem) => void;
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

function formatDebateCount(count?: number) {
  if (typeof count !== "number") {
    return "待统计";
  }

  return `${count} 场`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "等待中",
  running: "进行中",
  completed: "已完成",
  failed: "失败",
};

export function ArticleList({
  articles,
  deletingArticleId,
  emptyMessage = "还没有文章。先创建一场辩论，文章会自动进入文章库。",
  onDeleteArticle,
  onSelectArticle,
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm leading-6 text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="hidden grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 md:grid">
        <div className="col-span-4">文章</div>
        <div className="col-span-2">来源</div>
        <div className="col-span-2">关联辩论</div>
        <div className="col-span-3 text-right">创建时间</div>
        <div className="col-span-1 text-right">操作</div>
      </div>

      <div className="divide-y divide-slate-200">
        {articles.map((article) => {
          const isDeleting = deletingArticleId === article.id;

          return (
            <div
              className="grid grid-cols-12 gap-3 px-4 py-3 transition hover:bg-slate-50"
              key={article.id}
            >
              <button
                className="col-span-12 min-w-0 text-left outline-none transition hover:text-blue-700 focus:text-blue-700 md:col-span-4"
                disabled={!onSelectArticle || isDeleting}
                onClick={() => onSelectArticle?.(article)}
                type="button"
              >
                <div className="break-words text-sm font-medium text-slate-950 md:truncate">
                  {article.title}
                </div>
                {article.latest_debate_id ? (
                  <div className="mt-1 text-xs text-slate-500">
                    最近辩论 #{article.latest_debate_id}
                    {article.latest_debate_status
                      ? ` · ${STATUS_LABELS[article.latest_debate_status] ?? article.latest_debate_status}`
                      : ""}
                    {typeof article.latest_debate_credibility_score === "number"
                      ? ` · 可信度 ${article.latest_debate_credibility_score}/100`
                      : ""}
                  </div>
                ) : null}
              </button>

              <div className="col-span-12 break-words text-sm text-slate-600 md:col-span-2">
                {article.source || "暂无"}
              </div>
              <div className="col-span-6 text-sm text-slate-700 md:col-span-2">
                {formatDebateCount(article.debate_count)}
              </div>
              <div className="col-span-6 text-right text-sm text-slate-500 md:col-span-3">
                {formatDate(article.created_at)}
              </div>
              <div className="col-span-12 flex justify-end md:col-span-1">
                <button
                  className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  disabled={!onDeleteArticle || isDeleting}
                  onClick={() => onDeleteArticle?.(article)}
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
