"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import type {
  DebateDepth,
  OutputStyle,
  StageMode,
  TopicDebateCreate,
} from "@/lib/types";

const DEBATE_DEPTH_OPTIONS: Array<{
  value: DebateDepth;
  label: string;
  description: string;
}> = [
  { value: "quick", label: "快速", description: "压缩论证篇幅，适合临时判断。" },
  { value: "standard", label: "标准", description: "默认节奏，兼顾速度和完整性。" },
  { value: "deep", label: "深度", description: "更充分展开双方观点和裁判依据。" },
];

const OUTPUT_STYLE_OPTIONS: Array<{
  value: OutputStyle;
  label: string;
  description: string;
}> = [
  { value: "concise", label: "简洁", description: "突出结论、理由和分歧。" },
  { value: "detailed", label: "详细", description: "保留更多过程说明和论证细节。" },
];

const TOPIC_STAGE_MODE_OPTIONS: Array<{
  value: Extract<StageMode, "topic_3" | "topic_5">;
  label: string;
  description: string;
}> = [
  { value: "topic_3", label: "3 阶段极简", description: "定义议题、合并交锋、生成裁判报告。" },
  { value: "topic_5", label: "5 阶段标准", description: "默认话题辩论流程，包含更完整的交锋。" },
];

type TopicDebateFormProps = {
  onSubmit: (values: TopicDebateCreate) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  initialValue?: Partial<TopicDebateCreate>;
};

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 disabled:bg-zinc-900 disabled:text-zinc-500";

const optionClass =
  "flex cursor-pointer gap-3 rounded-md border border-zinc-800 bg-zinc-950/80 p-3 text-sm transition hover:border-zinc-700 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-500/10";

export function TopicDebateForm({
  onSubmit,
  loading = false,
  error,
  initialValue,
}: TopicDebateFormProps) {
  const [topic, setTopic] = useState(initialValue?.topic ?? "");
  const [background, setBackground] = useState(initialValue?.background ?? "");
  const [userQuestion, setUserQuestion] = useState(
    initialValue?.user_question ?? "",
  );
  const [debateDepth, setDebateDepth] = useState<DebateDepth>("standard");
  const [outputStyle, setOutputStyle] = useState<OutputStyle>("concise");
  const [stageMode, setStageMode] = useState<Extract<StageMode, "topic_3" | "topic_5">>(
    "topic_5",
  );
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
      debate_depth: debateDepth,
      output_style: outputStyle,
      stage_mode: stageMode,
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
            <h2 className="text-sm font-semibold text-white">话题输入</h2>
            <p className="text-xs text-zinc-500">给 Agent 一个清晰问题，再补充必要背景。</p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-200">辩论话题</span>
          <input
            className={inputClass}
            disabled={loading}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="例如：AI 编程会不会降低初级程序员的价值？"
            value={topic}
          />
        </label>

        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-zinc-200">背景说明</span>
          <textarea
            className={`${inputClass} min-h-32 resize-y leading-6`}
            disabled={loading}
            onChange={(event) => setBackground(event.target.value)}
            placeholder="可选：补充讨论背景、前提条件或你希望 Agent 参考的信息"
            value={background}
          />
        </label>

        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-zinc-200">关注问题</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y leading-6`}
            disabled={loading}
            onChange={(event) => setUserQuestion(event.target.value)}
            placeholder="可选：希望裁判或双方重点回应的问题"
            value={userQuestion}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <OptionGroup
          disabled={loading}
          name="topic-debate-depth"
          onChange={setDebateDepth}
          options={DEBATE_DEPTH_OPTIONS}
          title="辩论深度"
          value={debateDepth}
        />
        <OptionGroup
          disabled={loading}
          name="topic-output-style"
          onChange={setOutputStyle}
          options={OUTPUT_STYLE_OPTIONS}
          title="输出风格"
          value={outputStyle}
        />
        <OptionGroup
          disabled={loading}
          name="topic-stage-mode"
          onChange={setStageMode}
          options={TOPIC_STAGE_MODE_OPTIONS}
          title="阶段模式"
          value={stageMode}
        />
      </div>

      {(localError || error) && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-200">
          {localError || error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-zinc-500">
          默认使用标准深度、简洁输出和 5 阶段话题辩论流程。
        </p>
        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "正在创建..." : "开始话题辩论"}
        </button>
      </div>
    </form>
  );
}

function OptionGroup<T extends string>({
  disabled,
  name,
  onChange,
  options,
  title,
  value,
}: {
  disabled: boolean;
  name: string;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description: string }>;
  title: string;
  value: T;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-zinc-200">{title}</legend>
      <div className="grid gap-2">
        {options.map((option) => (
          <label className={optionClass} key={option.value}>
            <input
              checked={value === option.value}
              className="mt-1 h-4 w-4 border-zinc-600 bg-zinc-950 text-violet-500 focus:ring-blue-500"
              disabled={disabled}
              name={name}
              onChange={() => onChange(option.value)}
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
  );
}
