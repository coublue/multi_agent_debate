"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { createFollowUpDebate } from "@/lib/api";

type FollowUpDebateFormProps = {
  debateId: number;
  suggestedQuestions?: string[] | null;
};

const MAX_QUESTION_LENGTH = 1000;

export function FollowUpDebateForm({
  debateId,
  suggestedQuestions,
}: FollowUpDebateFormProps) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionLocked = useRef(false);
  const normalizedQuestion = question.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedQuestion) {
      setError("请输入追问内容后再创建新的辩论。");
      return;
    }

    if (submissionLocked.current) {
      return;
    }

    try {
      submissionLocked.current = true;
      setSubmitting(true);
      setError(null);
      const childDebate = await createFollowUpDebate(debateId, {
        question: normalizedQuestion,
      });
      router.push(`/debates/${childDebate.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "创建追问辩论失败，请稍后重试。",
      );
      submissionLocked.current = false;
      setSubmitting(false);
    }
  }

  function selectSuggestedQuestion(value: string) {
    if (submitting) {
      return;
    }
    setQuestion(value.slice(0, MAX_QUESTION_LENGTH));
    setError(null);
  }

  return (
    <section className="mb-5 rounded-md border border-violet-400/25 bg-violet-500/10 p-4 shadow-sm shadow-black/20 sm:p-5">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Continue analysis
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-50">
          从结果继续追问
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          基于本场裁判结果提出一个新问题。系统会创建独立的子辩论，原结果不会被修改。
        </p>
      </div>

      {suggestedQuestions && suggestedQuestions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-400">裁判建议追问</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((suggestion, index) => (
              <button
                className="max-w-full rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-left text-xs leading-5 text-slate-300 transition hover:border-violet-400/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
                key={`${index}-${suggestion}`}
                onClick={() => selectSuggestedQuestion(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form className="mt-4" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-slate-200" htmlFor="follow-up-question">
          新的关注问题
        </label>
        <textarea
          aria-describedby={error ? "follow-up-error" : "follow-up-help"}
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-700 bg-slate-950/90 px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          id="follow-up-question"
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(event) => {
            setQuestion(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="例如：如果只考虑没有专职运维团队的初创公司，这个结论还成立吗？"
          value={question}
        />

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 text-xs leading-5">
            {error ? (
              <p className="text-rose-300" id="follow-up-error" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-slate-500" id="follow-up-help">
                当前追问会覆盖原关注问题，并继承本场辩论配置。
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-slate-500">
            {question.length}/{MAX_QUESTION_LENGTH}
          </span>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            disabled={submitting || !normalizedQuestion}
            type="submit"
          >
            {submitting ? "正在创建子辩论..." : "创建追问辩论"}
          </button>
        </div>
      </form>
    </section>
  );
}
