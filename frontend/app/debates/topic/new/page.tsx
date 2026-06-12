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
      setError(err instanceof Error ? err.message : "创建快速话题辩论失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-slate-900 sm:px-6 lg:py-9">
      <nav className="mb-6 flex flex-wrap gap-4">
        <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" href="/">
          返回首页
        </Link>
        <Link
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
          href="/debates/new"
        >
          新建文章辩论
        </Link>
      </nav>

      <section className="mb-6">
        <p className="mb-2 text-sm font-medium text-slate-500">快速话题辩论</p>
        <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
          输入一个话题，快速开始辩论
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          适合临时观点讨论和轻量推演。系统会创建 5 阶段快速辩论，并跳转到辩论详情页查看过程。
        </p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <TopicDebateForm
          error={error}
          initialValue={initialValue}
          key={`${initialValue.topic ?? ""}-${initialValue.user_question ?? ""}`}
          loading={submitting}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}
