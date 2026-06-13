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
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  running: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-200",
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
      <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/70 px-4 py-10 text-center text-sm leading-6 text-slate-400">
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
            className="rounded-md border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700 hover:bg-slate-900/80"
            key={article.id}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${
                      isTopicArticle(article)
                        ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                        : "border-slate-700 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {getKindLabel(article)}
                  </span>
                  <span className="text-xs text-slate-500">
                    创建于 {formatDate(article.created_at)}
                  </span>
                </div>

                <button
                  className="block max-w-full text-left text-base font-semibold leading-6 text-slate-100 outline-none transition hover:text-cyan-200 focus:text-cyan-200 disabled:cursor-not-allowed"
                  disabled={!onSelectArticle || isDeleting || isCreatingDebate}
                  onClick={() => onSelectArticle?.(article)}
                  type="button"
                >
                  {article.title}
                </button>

                <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-400 md:grid-cols-2">
                  <div>
                    <span className="font-medium text-slate-300">来源：</span>
                    {getSourceLabel(article)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-300">关联辩论：</span>
                    {formatDebateCount(article.debate_count)}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-slate-300">关注问题：</span>
                    {article.user_question || "暂无"}
                  </div>
                </div>

                <LatestDebateSummary article={article} />
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                  disabled={!onSelectArticle || isDeleting || isCreatingDebate}
                  onClick={() => onSelectArticle?.(article)}
                  type="button"
                >
                  查看详情
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
                  disabled={!onCreateDebate || isDeleting || isCreatingDebate}
                  onClick={() => onCreateDebate?.(article)}
                  type="button"
                >
                  {isCreatingDebate ? "启动中" : "开始新辩论"}
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-rose-400/30 bg-rose-500/10 px-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
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
      <div className="mt-4 rounded-md border border-dashed border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-500">
        暂无关联辩论结果。
      </div>
    );
  }

  const status = article.latest_debate_status;
  const winner = article.latest_debate_winner;
  const statusClass = status
    ? STATUS_CLASSES[status] ?? "border-slate-700 bg-slate-800 text-slate-300"
    : "border-slate-700 bg-slate-800 text-slate-300";

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm md:grid-cols-4">
      <div>
        <div className="text-xs font-medium text-slate-500">最近辩论</div>
        <div className="mt-1 font-medium text-slate-200">#{article.latest_debate_id}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">状态</div>
        <span className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
          {status ? STATUS_LABELS[status] ?? status : "暂无"}
        </span>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">裁判结论</div>
        <div className="mt-1 font-medium text-slate-200">
          {winner ? WINNER_LABELS[winner] ?? winner : "暂无"}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">可信度 / 时间</div>
        <div className="mt-1 text-slate-300">
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
