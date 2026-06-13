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
  { value: "quick", label: "快速", description: "缩短分析路径，适合先做快速判断。" },
  { value: "standard", label: "标准", description: "默认 9 阶段文章辩论节奏。" },
  { value: "deep", label: "深度", description: "更充分展开论证、交锋和反驳。" },
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

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 disabled:bg-zinc-900 disabled:text-zinc-500";

const optionClass =
  "flex cursor-pointer gap-3 rounded-md border border-zinc-800 bg-zinc-950/80 p-3 text-sm transition hover:border-zinc-700 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-500/10";

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
      <div className="rounded-md border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-400/30 bg-violet-500/10 text-xs font-black text-violet-300">
            AI
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">文章输入</h2>
            <p className="text-xs text-zinc-500">粘贴文章，并指定你希望 Agent 重点判断的问题。</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-200">文章标题</span>
            <input
              className={inputClass}
              disabled={isDisabled}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="输入需要分析或讨论的文章标题"
              value={title}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-200">来源</span>
            <input
              className={inputClass}
              disabled={isDisabled}
              onChange={(event) => setSource(event.target.value)}
              placeholder="链接、媒体名称或备注，可选"
              value={source}
            />
          </label>
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-zinc-200">文章正文</span>
          <textarea
            className={`${inputClass} min-h-64 resize-y leading-6`}
            disabled={isDisabled}
            onChange={(event) => setContent(event.target.value)}
            placeholder="粘贴完整文章内容，长文会在结果页保留换行展示"
            value={content}
          />
        </label>

        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-zinc-200">关注问题</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y leading-6`}
            disabled={isDisabled}
            onChange={(event) => setUserQuestion(event.target.value)}
            placeholder="希望辩论特别关注的问题，可选"
            value={userQuestion}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-200">辩论深度</legend>
          <div className="grid gap-2">
            {DEBATE_DEPTH_OPTIONS.map((option) => (
              <label className={optionClass} key={option.value}>
                <input
                  checked={debateDepth === option.value}
                  className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-950 text-violet-500 focus:ring-blue-500"
                  disabled={isDisabled}
                  name="article-debate-depth"
                  onChange={() => setDebateDepth(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block font-medium text-zinc-100">{option.label}</span>
                  <span className="mt-1 block leading-6 text-zinc-500">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-200">输出风格</legend>
          <div className="grid gap-2">
            {OUTPUT_STYLE_OPTIONS.map((option) => (
              <label className={optionClass} key={option.value}>
                <input
                  checked={outputStyle === option.value}
                  className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-950 text-violet-500 focus:ring-blue-500"
                  disabled={isDisabled}
                  name="article-output-style"
                  onChange={() => setOutputStyle(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block font-medium text-zinc-100">{option.label}</span>
                  <span className="mt-1 block leading-6 text-zinc-500">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {(localError || error) && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-200">
          {localError || error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {loading && (
          <span className="text-sm text-zinc-500">
            正在提交文章并启动辩论...
          </span>
        )}
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          disabled={isDisabled}
          type="submit"
        >
          {loading ? "提交中..." : "开始辩论"}
        </button>
      </div>
    </form>
  );
}
