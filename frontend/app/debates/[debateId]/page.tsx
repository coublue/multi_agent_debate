"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DebateStage } from "@/components/debate-stage";
import { DebateStatus } from "@/components/debate-status";
import { JudgeReport } from "@/components/judge-report";
import { deleteDebate, getDebate } from "@/lib/api";
import type { DebateDetailRead, Winner } from "@/lib/types";

const WINNER_TEXT: Record<Winner, string> = {
  pro: "正方",
  con: "反方",
  mixed: "综合结论",
};

export default function DebateDetailPage() {
  const params = useParams<{ debateId: string }>();
  const router = useRouter();
  const debateId = Number(params.debateId);
  const [debate, setDebate] = useState<DebateDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadDebate(showLoading = true) {
      if (!Number.isFinite(debateId)) {
        setError("辩论 ID 无效。");
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }
        setError(null);
        const data = await getDebate(debateId);
        if (alive) {
          setDebate(data);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "辩论详情加载失败。");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadDebate();
    const timer = window.setInterval(() => {
      if (debate?.status === "pending" || debate?.status === "running") {
        loadDebate(false);
      }
    }, 5000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [debateId, debate?.status]);

  async function handleDeleteDebate() {
    if (!debate) {
      return;
    }

    const confirmed = window.confirm(`确定删除这场辩论吗？\n\n${debate.article.title}`);
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await deleteDebate(debate.id);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除辩论失败。");
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:py-9">
      <nav className="mb-6 flex items-center justify-between gap-4">
        <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" href="/">
          返回首页
        </Link>
        <div className="flex items-center gap-3">
          {debate ? (
            <button
              className="text-sm font-medium text-red-700 transition hover:text-red-900 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={deleting}
              onClick={handleDeleteDebate}
              type="button"
            >
              {deleting ? "删除中" : "删除辩论"}
            </button>
          ) : null}
          <Link className="text-sm font-medium text-slate-700 hover:text-slate-950" href="/debates/new">
            新建辩论
          </Link>
        </div>
      </nav>

      {loading ? <StateMessage text="正在加载辩论详情..." /> : null}
      {error ? <StateMessage tone="error" text={error} /> : null}
      {!loading && !error && !debate ? (
        <StateMessage text="未找到这场辩论。" />
      ) : null}

      {debate ? (
        <>
          <section className="mb-6">
            <p className="mb-2 text-sm font-medium text-slate-500">
              辩论 #{debate.id}
            </p>
            <h1 className="max-w-4xl break-words text-2xl font-semibold text-slate-950 sm:text-3xl">
              {debate.article.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <DebateStatus status={debate.status} />
              {typeof debate.credibility_score === "number" ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  可信度 {debate.credibility_score}/100
                </span>
              ) : null}
              {debate.winner ? (
                <span className="text-sm text-slate-500">
                  结论方：{WINNER_TEXT[debate.winner]}
                </span>
              ) : null}
            </div>
          </section>

          {debate.error_message ? (
            <StateMessage tone="error" text={debate.error_message} />
          ) : null}

          <section className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">文章</h2>
              {debate.article.source ? (
                <p className="mb-2 break-words text-sm text-slate-600">
                  来源：{debate.article.source}
                </p>
              ) : null}
              {debate.article.user_question ? (
                <p className="mb-4 break-words border-l-4 border-blue-500 pl-3 text-sm leading-6 text-slate-700">
                  关注问题：{debate.article.user_question}
                </p>
              ) : null}
              <p className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words pr-1 text-sm leading-7 text-slate-700">
                {debate.article.content}
              </p>
            </article>

            <aside className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-950">
                辩论概要
              </h2>
              <KeyValue label="核心主张" value={debate.main_claim} />
              <KeyValue label="辩题" value={debate.debate_topic} />
              <KeyValue label="创建时间" value={formatDate(debate.created_at)} />
              <KeyValue label="更新时间" value={formatDate(debate.updated_at)} />
            </aside>
          </section>

          <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">9 阶段消息</h2>
              <span className="text-sm text-slate-500">
                {debate.messages.length} 条输出
              </span>
            </div>
            <DebateStage messages={debate.messages} />
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              最终裁判报告
            </h2>
            <JudgeReport report={debate.final_report} />
          </section>
        </>
      ) : null}
    </main>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <p className="break-words text-sm leading-6 text-slate-800">
        {value || "暂无"}
      </p>
    </div>
  );
}

function StateMessage({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`mb-5 rounded-md border px-4 py-5 text-sm leading-6 ${toneClass}`}>
      {text}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
