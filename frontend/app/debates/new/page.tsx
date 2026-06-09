"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArticleForm } from "@/components/article-form";
import { createArticle, createDebate } from "@/lib/api";
import type { ArticleCreate } from "@/lib/types";

export default function NewDebatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ArticleCreate) {
    try {
      setSubmitting(true);
      setError(null);
      const article = await createArticle(values);
      const debate = await createDebate({ article_id: article.id });
      router.push(`/debates/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建辩论失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-slate-900 sm:px-6 lg:py-9">
      <nav className="mb-6">
        <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" href="/">
          返回首页
        </Link>
      </nav>

      <section className="mb-6">
        <p className="mb-2 text-sm font-medium text-slate-500">新建辩论</p>
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
          提交待分析文章
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          填写标题、正文和关注问题后，系统会创建文章并立即启动多 Agent
          辩论。
        </p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <ArticleForm onSubmit={handleSubmit} loading={submitting} error={error} />
      </section>
    </main>
  );
}
