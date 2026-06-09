"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArticleList } from "@/components/article-list";
import { deleteArticle, listArticles } from "@/lib/api";
import type { ArticleListItem } from "@/lib/types";

const DELETE_ARTICLE_CONFIRM_MESSAGE =
  "删除文章会同时删除该文章下的所有辩论记录，此操作不可恢复。";

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingArticleId, setDeletingArticleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:py-10">
      <nav className="mb-6 flex items-center justify-between gap-4">
        <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" href="/">
          返回首页
        </Link>
        <Link className="text-sm font-medium text-slate-700 hover:text-slate-950" href="/debates/new">
          新建辩论
        </Link>
      </nav>

      <section className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-slate-500">Article Library</p>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            文章库
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            查看已提交的文章，进入详情后可以查看关联辩论，或基于同一篇文章再次发起辩论。
          </p>
        </div>
        <span className="text-sm text-slate-500">{articles.length} 篇文章</span>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {loading ? <StateMessage text="正在加载文章列表..." /> : null}
        {error ? <StateMessage tone="error" text={error} /> : null}
        {!loading && !error ? (
          <ArticleList
            articles={articles}
            deletingArticleId={deletingArticleId}
            onDeleteArticle={handleDeleteArticle}
            onSelectArticle={(article) => router.push(`/articles/${article.id}`)}
          />
        ) : null}
      </section>
    </main>
  );
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
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`rounded-md border px-4 py-5 text-sm leading-6 ${toneClass}`}>
      {text}
    </div>
  );
}
