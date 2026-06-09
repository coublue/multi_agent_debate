"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import type { TopicDebateCreate } from "@/lib/types";

type TopicDebateFormProps = {
  onSubmit: (values: TopicDebateCreate) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export function TopicDebateForm({
  onSubmit,
  loading = false,
  error,
}: TopicDebateFormProps) {
  const [topic, setTopic] = useState("");
  const [background, setBackground] = useState("");
  const [userQuestion, setUserQuestion] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!topic.trim()) {
      setLocalError("请填写辩论话题。");
      return;
    }

    await onSubmit({
      topic: topic.trim(),
      background: background.trim() || undefined,
      user_question: userQuestion.trim() || undefined,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="space-y-1.5">
        <span className="text-sm font-medium text-slate-800">辩论话题</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={loading}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="例如：AI 编程会不会降低初级程序员的价值？"
          value={topic}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-slate-800">背景说明</span>
        <textarea
          className="min-h-32 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={loading}
          onChange={(event) => setBackground(event.target.value)}
          placeholder="可选：补充讨论背景、前提条件或你希望 Agent 参考的信息。"
          value={background}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-slate-800">关注问题</span>
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={loading}
          onChange={(event) => setUserQuestion(event.target.value)}
          placeholder="可选：希望裁判或双方重点回应的问题。"
          value={userQuestion}
        />
      </label>

      {(localError || error) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
          {localError || error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-500">
          快速话题辩论默认使用 5 阶段流程，适合临时观点推演。
        </p>
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "正在创建..." : "开始快速辩论"}
        </button>
      </div>
    </form>
  );
}
