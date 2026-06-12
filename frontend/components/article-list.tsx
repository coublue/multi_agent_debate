import type { ArticleListItem } from "@/lib/types";

type ArticleListProps = {
  articles: ArticleListItem[];
  creatingDebateArticleId?: number | null;
  deletingArticleId?: number | null;
  emptyMessage?: string;
  onCreateDebate?: (article: ArticleListItem) => void;
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

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const WINNER_LABELS: Record<string, string> = {
  pro: "正方胜",
  con: "反方胜",
  mixed: "均衡",
  balanced: "均衡",
};

function isTopicArticle(article: ArticleListItem) {
  return article.source === "topic";
}

function getKindLabel(article: ArticleListItem) {
  return isTopicArticle(article) ? "话题" : "文章";
}

function getSourceLabel(article: ArticleListItem) {
  if (isTopicArticle(article)) {
    return "快速话题";
  }
  return article.source || "暂无来源";
}

export function ArticleList({
  articles,
  creatingDebateArticleId,
  deletingArticleId,
  emptyMessage = "还没有文章。先创建一场辩论，文章会自动进入文章库。",
  onCreateDebate,
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
    <div className="space-y-3">
      {articles.map((article) => {
        const isCreatingDebate = creatingDebateArticleId === article.id;
        const isDeleting = deletingArticleId === article.id;

        return (
          <article
            className="rounded-md border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            key={article.id}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${
                      isTopicArticle(article)
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {getKindLabel(article)}
                  </span>
                  <span className="text-xs text-slate-500">
                    创建于 {formatDate(article.created_at)}
                  </span>
                </div>

                <button
                  className="block max-w-full text-left text-base font-semibold leading-6 text-slate-950 outline-none transition hover:text-blue-700 focus:text-blue-700"
                  disabled={!onSelectArticle || isDeleting || isCreatingDebate}
                  onClick={() => onSelectArticle?.(article)}
                  type="button"
                >
                  {article.title}
                </button>

                <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-600 md:grid-cols-2">
                  <div>
                    <span className="font-medium text-slate-700">来源：</span>
                    {getSourceLabel(article)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">关联辩论：</span>
                    {formatDebateCount(article.debate_count)}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-slate-700">关注问题：</span>
                    {article.user_question || "暂无"}
                  </div>
                </div>

                <LatestDebateSummary article={article} />
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  disabled={!onSelectArticle || isDeleting || isCreatingDebate}
                  onClick={() => onSelectArticle?.(article)}
                  type="button"
                >
                  查看详情
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={!onCreateDebate || isDeleting || isCreatingDebate}
                  onClick={() => onCreateDebate?.(article)}
                  type="button"
                >
                  {isCreatingDebate ? "启动中" : "开始新辩论"}
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  disabled={!onDeleteArticle || isDeleting || isCreatingDebate}
                  onClick={() => onDeleteArticle?.(article)}
                  type="button"
                >
                  {isDeleting ? "删除中" : "删除"}
                </button>
              </div>
            </div>

          </article>
        );
      })}
    </div>
  );
}

function LatestDebateSummary({ article }: { article: ArticleListItem }) {
  if (!article.latest_debate_id) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
        暂无关联辩论结果。
      </div>
    );
  }

  const status = article.latest_debate_status;
  const winner = article.latest_debate_winner;
  const statusClass = status
    ? STATUS_CLASSES[status] ?? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm md:grid-cols-4">
      <div>
        <div className="text-xs font-medium text-slate-500">最近辩论</div>
        <div className="mt-1 font-medium text-slate-800">#{article.latest_debate_id}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">状态</div>
        <span className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
          {status ? STATUS_LABELS[status] ?? status : "暂无"}
        </span>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">裁判结论</div>
        <div className="mt-1 font-medium text-slate-800">
          {winner ? WINNER_LABELS[winner] ?? winner : "暂无"}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">可信度 / 时间</div>
        <div className="mt-1 text-slate-800">
          {typeof article.latest_debate_credibility_score === "number"
            ? `${article.latest_debate_credibility_score}/100`
            : "暂无评分"}
        </div>
        {article.latest_debate_created_at ? (
          <div className="mt-1 text-xs text-slate-500">
            {formatDate(article.latest_debate_created_at)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
