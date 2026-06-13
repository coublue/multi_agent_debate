"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArticleDetail } from "@/components/article-detail";
import {
  createDebate,
  deleteArticle,
  deleteDebate,
  getArticle,
  listArticleDebates,
} from "@/lib/api";
import type { ArticleRead, DebateListItem } from "@/lib/types";

const DELETE_ARTICLE_CONFIRM_MESSAGE =
  "删除文章会同时删除该文章下的所有辩论记录，此操作不可恢复。";

export default function ArticleDetailPage() {
  const params = useParams<{ articleId: string }>();
  const router = useRouter();
  const articleId = Number(params.articleId);
  const [article, setArticle] = useState<ArticleRead | null>(null);
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDebate, setCreatingDebate] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState(false);
  const [deletingDebateId, setDeletingDebateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadArticle() {
      if (!Number.isFinite(articleId)) {
        setError("文章 ID 无效。");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [articleData, debateData] = await Promise.all([
          getArticle(articleId),
          listArticleDebates(articleId),
        ]);
        if (alive) {
          setArticle(articleData);
          setDebates(debateData);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "文章详情加载失败。");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadArticle();
    return () => {
      alive = false;
    };
  }, [articleId]);

  async function handleCreateDebate() {
    if (!article) {
      return;
    }

    try {
      setCreatingDebate(true);
      setError(null);
      const debate = await createDebate({
        article_id: article.id,
        debate_depth: "standard",
        output_style: "detailed",
        stage_mode: "article_9",
      });
      router.push(`/debates/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建辩论失败。");
      setCreatingDebate(false);
    }
  }

  async function handleDeleteArticle() {
    if (!article) {
      return;
    }

    const confirmed = window.confirm(
      `${DELETE_ARTICLE_CONFIRM_MESSAGE}\n\n确认删除：${article.title}`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingArticle(true);
      setError(null);
      await deleteArticle(article.id);
      router.push("/articles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除文章失败。");
      setDeletingArticle(false);
    }
  }

  async function handleDeleteDebate(debate: DebateListItem) {
    const confirmed = window.confirm(`确定删除这场辩论吗？\n\n${debate.title}`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingDebateId(debate.id);
      setError(null);
      await deleteDebate(debate.id);
      setDebates((current) => current.filter((item) => item.id !== debate.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除辩论失败。");
    } finally {
      setDeletingDebateId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:py-9">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 flex items-center justify-between gap-4">
          <Link className="text-sm font-medium text-cyan-300 hover:text-cyan-100" href="/articles">
            返回文章库
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-white" href="/debates/new">
            新建辩论
          </Link>
        </nav>

        {loading ? <StateMessage text="正在加载文章详情..." /> : null}
        {error ? <StateMessage tone="error" text={error} /> : null}
        {!loading && !error && !article ? <StateMessage text="未找到这篇文章。" /> : null}

        {article ? (
          <ArticleDetail
            article={article}
            creatingDebate={creatingDebate}
            debates={debates}
            deletingArticle={deletingArticle}
            deletingDebateId={deletingDebateId}
            onCreateDebate={handleCreateDebate}
            onDeleteArticle={handleDeleteArticle}
            onDeleteDebate={handleDeleteDebate}
            onSelectDebate={(debate) => router.push(`/debates/${debate.id}`)}
          />
        ) : null}

        {deletingDebateId ? (
          <div className="mt-4 text-right text-sm text-slate-500">
            正在删除辩论 #{deletingDebateId}...
          </div>
        ) : null}
      </div>
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
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-slate-800 bg-slate-950/70 text-slate-400";

  return (
    <div className={`mb-5 rounded-md border px-4 py-5 text-sm leading-6 ${toneClass}`}>
      {text}
    </div>
  );
}
