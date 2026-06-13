"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ArticleList } from "@/components/article-list";
import { createDebate, deleteArticle, listArticles } from "@/lib/api";
import type { ArticleListItem } from "@/lib/types";

const DELETE_ARTICLE_CONFIRM_MESSAGE =
  "删除文章会同时删除该文章下的所有辩论记录，此操作不可恢复。";

type ArticleKindFilter = "all" | "article" | "topic";
type ArticleSortKey =
  | "created_at"
  | "latest_debate_created_at"
  | "latest_debate_credibility_score";

const KIND_FILTERS: Array<{ label: string; value: ArticleKindFilter }> = [
  { label: "全部", value: "all" },
  { label: "普通文章", value: "article" },
  { label: "话题", value: "topic" },
];

const SORT_OPTIONS: Array<{ label: string; value: ArticleSortKey }> = [
  { label: "创建时间", value: "created_at" },
  { label: "最近辩论时间", value: "latest_debate_created_at" },
  { label: "最近可信度评分", value: "latest_debate_credibility_score" },
];

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
  const [creatingDebateArticleId, setCreatingDebateArticleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ArticleKindFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<ArticleSortKey>("created_at");

  const filteredArticles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return articles
      .filter((article) => {
        if (kindFilter === "topic") {
          return isTopicArticle(article);
        }
        if (kindFilter === "article") {
          return !isTopicArticle(article);
        }
        return true;
      })
      .filter((article) => {
        if (!query) {
          return true;
        }

        return [article.title, article.source, article.user_question]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((left, right) => compareArticles(left, right, sortKey));
  }, [articles, kindFilter, searchTerm, sortKey]);

  const articleCount = articles.filter((article) => !isTopicArticle(article)).length;
  const topicCount = articles.length - articleCount;

  useEffect(() => {
    let alive = true;

    async function loadArticles() {
      try {
        setLoading(true);
        setError(null);
        const data = await listArticles();
        if (alive) {
          setArticles(data);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "文章列表加载失败。");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadArticles();
    return () => {
      alive = false;
    };
  }, []);

  async function handleDeleteArticle(article: ArticleListItem) {
    const confirmed = window.confirm(
      `${DELETE_ARTICLE_CONFIRM_MESSAGE}\n\n确认删除：${article.title}`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingArticleId(article.id);
      setError(null);
      await deleteArticle(article.id);
      setArticles((current) => current.filter((item) => item.id !== article.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除文章失败。");
    } finally {
      setDeletingArticleId(null);
    }
  }

  async function handleCreateDebate(article: ArticleListItem) {
    try {
      setCreatingDebateArticleId(article.id);
      setError(null);
      const debate = await createDebate({ article_id: article.id });
      router.push(`/debates/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建辩论失败。");
      setCreatingDebateArticleId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 flex items-center justify-between gap-4">
          <Link className="text-sm font-medium text-cyan-300 hover:text-cyan-100" href="/">
            返回首页
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-white" href="/debates/new">
            新建辩论
          </Link>
        </nav>

        <section className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-7 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium text-cyan-300">Article Library</p>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              文章库
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              查看已提交的文章，进入详情后可以查看关联辩论，或基于同一篇文章再次发起辩论。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span>{articles.length} 条记录</span>
            <span className="text-slate-700">/</span>
            <span>{articleCount} 篇文章</span>
            <span className="text-slate-700">/</span>
            <span>{topicCount} 个话题</span>
          </div>
        </section>

        <section className="rounded-md border border-slate-800 bg-slate-900/60 p-4 shadow-sm shadow-black/20 sm:p-5">
          {loading ? <StateMessage text="正在加载文章列表..." /> : null}
          {error ? <StateMessage tone="error" text={error} /> : null}
          {!loading && !error ? (
            <div className="space-y-4">
              <ArticleLibraryControls
                kindFilter={kindFilter}
                resultCount={filteredArticles.length}
                searchTerm={searchTerm}
                sortKey={sortKey}
                totalCount={articles.length}
                onKindFilterChange={setKindFilter}
                onSearchTermChange={setSearchTerm}
                onSortKeyChange={setSortKey}
              />
              <ArticleList
                articles={filteredArticles}
                creatingDebateArticleId={creatingDebateArticleId}
                deletingArticleId={deletingArticleId}
                emptyMessage="没有符合当前筛选条件的记录。"
                onCreateDebate={handleCreateDebate}
                onDeleteArticle={handleDeleteArticle}
                onSelectArticle={(article) => router.push(`/articles/${article.id}`)}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ArticleLibraryControls({
  kindFilter,
  resultCount,
  searchTerm,
  sortKey,
  totalCount,
  onKindFilterChange,
  onSearchTermChange,
  onSortKeyChange,
}: {
  kindFilter: ArticleKindFilter;
  resultCount: number;
  searchTerm: string;
  sortKey: ArticleSortKey;
  totalCount: number;
  onKindFilterChange: (value: ArticleKindFilter) => void;
  onSearchTermChange: (value: string) => void;
  onSortKeyChange: (value: ArticleSortKey) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((filter) => {
          const isActive = kindFilter === filter.value;
          return (
            <button
              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${
                isActive
                  ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
              }`}
              key={filter.value}
              onClick={() => onKindFilterChange(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-400">
            搜索标题、来源或关注问题
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="输入关键词"
            value={searchTerm}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-400">排序</span>
          <select
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
            onChange={(event) => onSortKeyChange(event.target.value as ArticleSortKey)}
            value={sortKey}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="text-xs text-slate-500">
        当前显示 {resultCount} 条，共 {totalCount} 条；缺少最近辩论或评分的记录会排在后面。
      </div>
    </div>
  );
}

function isTopicArticle(article: ArticleListItem) {
  return article.source === "topic";
}

function compareArticles(left: ArticleListItem, right: ArticleListItem, sortKey: ArticleSortKey) {
  const leftValue = getSortValue(left, sortKey);
  const rightValue = getSortValue(right, sortKey);
  const leftCreatedAt = getSortValue(left, "created_at") ?? 0;
  const rightCreatedAt = getSortValue(right, "created_at") ?? 0;

  if (leftValue === null && rightValue === null) {
    return rightCreatedAt - leftCreatedAt;
  }
  if (leftValue === null) {
    return 1;
  }
  if (rightValue === null) {
    return -1;
  }
  if (rightValue !== leftValue) {
    return rightValue - leftValue;
  }

  return rightCreatedAt - leftCreatedAt;
}

function getSortValue(article: ArticleListItem, sortKey: ArticleSortKey): number | null {
  if (sortKey === "latest_debate_credibility_score") {
    return typeof article.latest_debate_credibility_score === "number"
      ? article.latest_debate_credibility_score
      : null;
  }

  const rawValue = article[sortKey];
  if (!rawValue) {
    return null;
  }

  const timestamp = new Date(rawValue).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function StateMessage({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  const toneClass =
    tone === "error"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-slate-800 bg-slate-950/70 text-slate-400";

  return <div className={`rounded-md border px-4 py-5 text-sm leading-6 ${toneClass}`}>{text}</div>;
}
