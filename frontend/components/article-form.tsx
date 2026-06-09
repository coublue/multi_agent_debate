"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { ArticleCreate } from "@/lib/types";

type ArticleFormProps = {
  onSubmit: (article: ArticleCreate) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  initialValue?: Partial<ArticleCreate>;
};

export function ArticleForm({
  onSubmit,
  loading = false,
  error,
  initialValue,
}: ArticleFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [source, setSource] = useState(initialValue?.source ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [userQuestion, setUserQuestion] = useState(
    initialValue?.user_question ?? "",
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const isDisabled = loading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!title.trim() || !content.trim()) {
      setLocalError("请填写文章标题和正文内容。");
      return;
    }

    await onSubmit({
      title: title.trim(),
      source: source.trim() || undefined,
      content: content.trim(),
      user_question: userQuestion.trim() || undefined,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-800">文章标题</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            disabled={isDisabled}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="输入需要核查或讨论的文章标题"
            value={title}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-800">来源</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            disabled={isDisabled}
            onChange={(event) => setSource(event.target.value)}
            placeholder="链接、媒体名称或备注，可选"
            value={source}
          />
        </label>
      </div>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-slate-800">文章正文</span>
        <textarea
          className="min-h-64 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={isDisabled}
          onChange={(event) => setContent(event.target.value)}
          placeholder="粘贴完整文章内容，长文会在结果页保留换行展示"
          value={content}
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-slate-800">
          关注问题
        </span>
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={isDisabled}
          onChange={(event) => setUserQuestion(event.target.value)}
          placeholder="希望辩论特别关注的问题，可选"
          value={userQuestion}
        />
      </label>

      {(localError || error) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
          {localError || error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {loading && (
          <span className="text-sm text-slate-500">正在提交文章并启动辩论...</span>
        )}
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isDisabled}
          type="submit"
        >
          {loading ? "提交中" : "开始辩论"}
        </button>
      </div>
    </form>
  );
}
