import { DebateList } from "@/components/debate-list";
import type { ArticleRead, DebateListItem } from "@/lib/types";

type ArticleDetailProps = {
  article: ArticleRead;
  debates: DebateListItem[];
  creatingDebate?: boolean;
  deletingArticle?: boolean;
  deletingDebateId?: number | null;
  onCreateDebate?: () => void;
  onDeleteArticle?: () => void;
  onDeleteDebate?: (debate: DebateListItem) => void;
  onSelectDebate?: (debate: DebateListItem) => void;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ArticleDetail({
  article,
  debates,
  creatingDebate = false,
  deletingArticle = false,
  deletingDebateId,
  onCreateDebate,
  onDeleteArticle,
  onDeleteDebate,
  onSelectDebate,
}: ArticleDetailProps) {
  return (
    <>
      <section className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <article className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-2 text-sm font-medium text-slate-500">
                文章 #{article.id}
              </p>
              <h1 className="break-words text-2xl font-semibold text-slate-950 sm:text-3xl">
                {article.title}
              </h1>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!onCreateDebate || creatingDebate || deletingArticle}
                onClick={onCreateDebate}
                type="button"
              >
                {creatingDebate ? "创建中" : "基于本文发起辩论"}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={!onDeleteArticle || deletingArticle || creatingDebate}
                onClick={onDeleteArticle}
                type="button"
              >
                {deletingArticle ? "删除中" : "删除文章"}
              </button>
            </div>
          </div>

          {article.source ? (
            <p className="mb-2 break-words text-sm text-slate-600">
              来源：{article.source}
            </p>
          ) : null}
          {article.user_question ? (
            <p className="mb-4 break-words border-l-4 border-blue-500 pl-3 text-sm leading-6 text-slate-700">
              关注问题：{article.user_question}
            </p>
          ) : null}
          <p className="max-h-[42rem] overflow-auto whitespace-pre-wrap break-words pr-1 text-sm leading-7 text-slate-700">
            {article.content}
          </p>
        </article>

        <aside className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">文章信息</h2>
          <KeyValue label="来源" value={article.source} />
          <KeyValue label="关联辩论" value={`${debates.length} 场`} />
          <KeyValue label="创建时间" value={formatDate(article.created_at)} />
          <KeyValue label="更新时间" value={formatDate(article.updated_at)} />
        </aside>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">关联辩论</h2>
          <span className="text-sm text-slate-500">{debates.length} 场</span>
        </div>
        <DebateList
          debates={debates}
          deletingDebateId={deletingDebateId}
          emptyMessage="这篇文章还没有关联辩论。"
          onDeleteDebate={onDeleteDebate}
          onSelectDebate={onSelectDebate}
        />
      </section>
    </>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <p className="break-words text-sm leading-6 text-slate-800">
        {value || "暂无"}
      </p>
    </div>
  );
}
