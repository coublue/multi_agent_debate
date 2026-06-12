"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type {
  ArticleDebateFormValues,
  DebateDepth,
  OutputStyle,
} from "@/lib/types";

const DEBATE_DEPTH_OPTIONS: Array<{
  value: DebateDepth;
  label: string;
  description: string;
}> = [
  { value: "quick", label: "快速", description: "更短的分析路径，适合快速判断。" },
  { value: "standard", label: "标准", description: "默认 9 阶段文章辩论节奏。" },
  { value: "deep", label: "深度", description: "更充分展开论证和反驳。" },
];

const OUTPUT_STYLE_OPTIONS: Array<{
  value: OutputStyle;
  label: string;
  description: string;
}> = [
  { value: "concise", label: "简洁", description: "控制篇幅，突出结论和关键理由。" },
  { value: "detailed", label: "详细", description: "保留更多分析过程和论据展开。" },
];

type ArticleFormProps = {
  onSubmit: (article: ArticleDebateFormValues) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  initialValue?: Partial<ArticleDebateFormValues>;
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
  const [debateDepth, setDebateDepth] = useState<DebateDepth>(
    initialValue?.debate_depth ?? "standard",
  );
  const [outputStyle, setOutputStyle] = useState<OutputStyle>(
    initialValue?.output_style ?? "detailed",
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
      debate_depth: debateDepth,
      output_style: outputStyle,
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

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800">辩论深度</legend>
          <div className="grid gap-2">
            {DEBATE_DEPTH_OPTIONS.map((option) => (
              <label
                className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                key={option.value}
              >
                <input
                  checked={debateDepth === option.value}
                  className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={isDisabled}
                  name="article-debate-depth"
                  onChange={() => setDebateDepth(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block font-medium text-slate-900">{option.label}</span>
                  <span className="mt-1 block leading-6 text-slate-500">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800">输出风格</legend>
          <div className="grid gap-2">
            {OUTPUT_STYLE_OPTIONS.map((option) => (
              <label
                className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                key={option.value}
              >
                <input
                  checked={outputStyle === option.value}
                  className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={isDisabled}
                  name="article-output-style"
                  onChange={() => setOutputStyle(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block font-medium text-slate-900">{option.label}</span>
                  <span className="mt-1 block leading-6 text-slate-500">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

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
