"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TopicDebateForm } from "@/components/topic-debate-form";
import { createTopicDebate } from "@/lib/api";
import type { TopicDebateCreate } from "@/lib/types";

export default function NewTopicDebatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialValue, setInitialValue] = useState<Partial<TopicDebateCreate>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic")?.trim();
    const background = params.get("background")?.trim();
    const userQuestion = params.get("user_question")?.trim();

    setInitialValue({
      topic: topic || undefined,
      background: background || undefined,
      user_question: userQuestion || undefined,
    });
  }, []);

  async function handleSubmit(values: TopicDebateCreate) {
    try {
      setSubmitting(true);
      setError(null);
      const debate = await createTopicDebate(values);
      router.push(`/debates/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建话题辩论失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 text-zinc-100 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 flex flex-wrap gap-3">
          <Link
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-violet-500/60 hover:text-white"
            href="/"
          >
            返回首页
          </Link>
          <Link
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:border-violet-500/60 hover:text-violet-200"
            href="/debates/new"
          >
            新建文章辩论
          </Link>
        </nav>

        <section className="mb-6 rounded-md border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/40">
          <p className="mb-2 text-sm font-medium text-violet-300">
            AI Assist: Topic debate
          </p>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            输入一个话题，快速开始辩论
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            适合临时观点讨论和轻量推演。系统会创建 3 或 5 阶段话题辩论，并跳转到详情页查看过程。
          </p>
        </section>

        <section className="rounded-md border border-zinc-800 bg-[#111116] p-4 shadow-2xl shadow-black/50 sm:p-5">
          <TopicDebateForm
            error={error}
            initialValue={initialValue}
            key={`${initialValue.topic ?? ""}-${initialValue.user_question ?? ""}`}
            loading={submitting}
            onSubmit={handleSubmit}
          />
        </section>
      </div>
    </main>
  );
}
