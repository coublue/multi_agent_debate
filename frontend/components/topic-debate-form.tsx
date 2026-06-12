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
  { value: "topic_3", label: "3 阶段极简", description: "定义议题、合并交锋、裁判报告。" },
  { value: "topic_5", label: "5 阶段标准", description: "默认话题辩论流程，包含更完整交锋。" },
];

type TopicDebateFormProps = {
  onSubmit: (values: TopicDebateCreate) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  initialValue?: Partial<TopicDebateCreate>;
};

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

      <div className="grid gap-4 md:grid-cols-3">
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
                  disabled={loading}
                  name="topic-debate-depth"
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
                  disabled={loading}
                  name="topic-output-style"
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800">阶段模式</legend>
          <div className="grid gap-2">
            {TOPIC_STAGE_MODE_OPTIONS.map((option) => (
              <label
                className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                key={option.value}
              >
                <input
                  checked={stageMode === option.value}
                  className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                  name="topic-stage-mode"
                  onChange={() => setStageMode(option.value)}
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-500">
          快速话题辩论默认使用标准深度、简洁输出和 5 阶段流程。
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
