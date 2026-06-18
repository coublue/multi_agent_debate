"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArticleForm } from "@/components/article-form";
import { PageBackLink } from "@/components/page-back-link";
import { SiteHeader } from "@/components/site-header";
import { createArticle, createDebate } from "@/lib/api";
import type { ArticleDebateFormValues } from "@/lib/types";

export default function NewDebatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ArticleDebateFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      const {
        debate_depth,
        output_style,
        title,
        source,
        content,
        user_question,
      } = values;
      const article = await createArticle({
        title,
        source,
        content,
        user_question,
      });
      const debate = await createDebate({
        article_id: article.id,
        debate_depth,
        output_style,
        stage_mode: "article_9",
      });
      router.push(`/debates/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建文章辩论失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen text-zinc-100">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <nav
          aria-label="页面层级与辩论类型切换"
          className="mb-6 flex flex-wrap items-center justify-between gap-3"
        >
          <PageBackLink href="/" label="返回首页" />
          <Link
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:border-violet-500/60 hover:text-violet-200"
            href="/debates/topic/new"
          >
            切换到话题辩论
          </Link>
        </nav>

        <section className="mb-6 rounded-md border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/40">
          <p className="mb-2 text-sm font-medium text-violet-300">
            AI Assist: Article debate
          </p>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            提交一篇文章，让 Agent 展开辩论
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            填写标题、正文和你关心的问题后，系统会创建文章并启动 9 阶段多 Agent 辩论。
          </p>
        </section>

        <section className="rounded-md border border-zinc-800 bg-[#111116] p-4 shadow-2xl shadow-black/50 sm:p-5">
          <ArticleForm onSubmit={handleSubmit} loading={submitting} error={error} />
        </section>
      </div>
    </main>
  );
}
