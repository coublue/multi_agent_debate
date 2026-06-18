"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DebateStage } from "@/components/debate-stage";
import { DebateSummaryPanel } from "@/components/debate-summary-panel";
import {
  DebateStageProgress,
  type DebateStageMode,
  getStageOrder,
} from "@/components/debate-stage-progress";
import {
  DebateViewTabs,
  type DebateViewMode,
} from "@/components/debate-view-tabs";
import { DisagreementMap } from "@/components/disagreement-map";
import { FollowUpDebateForm } from "@/components/follow-up-debate-form";
import { JudgeReport } from "@/components/judge-report";
import { PageBackLink } from "@/components/page-back-link";
import { ReportActions } from "@/components/report-actions";
import { SiteHeader } from "@/components/site-header";
import { deleteDebate, getDebate, rerunDebate } from "@/lib/api";
import type { DebateDetailRead } from "@/lib/types";

export default function DebateDetailPage() {
  const params = useParams<{ debateId: string }>();
  const router = useRouter();
  const debateId = Number(params.debateId);
  const [debate, setDebate] = useState<DebateDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DebateViewMode>("overview");

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

    const confirmed = window.confirm(
      `确定删除这场辩论吗？\n\n${debate.article.title}`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await deleteDebate(debate.id);
      router.push("/debates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除辩论失败。");
      setDeleting(false);
    }
  }

  async function handleRerunDebate() {
    if (!debate || debate.status !== "failed") {
      return;
    }

    const confirmed = window.confirm(
      `确认重新运行整场辩论吗？\n\n旧的阶段消息和失败结果会被清空，并从第一阶段重新开始。\n\n${debate.article.title}`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setRerunning(true);
      setError(null);
      await rerunDebate(debate.id);
      const refreshed = await getDebate(debate.id);
      setDebate(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新运行辩论失败。");
    } finally {
      setRerunning(false);
    }
  }

  const isTopicDebate = debate?.article.source === "topic";
  const debateMode = debate ? getDebateMode(debate) : "article";
  const stageOrder = getStageOrder(debateMode);
  const visibleStageSet = new Set(stageOrder);
  const visibleMessageCount =
    debate?.messages.filter((message) => visibleStageSet.has(message.stage)).length ??
    0;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:py-9">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <PageBackLink href="/debates" label="返回历史辩论" />
            <div className="flex items-center gap-3">
              {debate ? (
                <button
                  className="text-sm font-medium text-rose-300 transition hover:text-rose-100 disabled:cursor-not-allowed disabled:text-slate-600"
                  disabled={deleting}
                  onClick={handleDeleteDebate}
                  type="button"
                >
                  {deleting ? "删除中..." : "删除辩论"}
                </button>
              ) : null}
              <Link className="text-sm font-medium text-slate-300 hover:text-white" href="/debates/new">
                新建辩论
              </Link>
            </div>
          </div>

        {loading ? <StateMessage text="正在加载辩论详情..." /> : null}
        {error ? <StateMessage tone="error" text={error} /> : null}
        {!loading && !error && !debate ? (
          <StateMessage text="未找到这场辩论。" />
        ) : null}

        {debate ? (
          <>
            <DebateSummaryPanel
              debate={debate}
              isTopicDebate={Boolean(isTopicDebate)}
              onRerun={handleRerunDebate}
              rerunning={rerunning}
              stageOrder={stageOrder}
              visibleMessageCount={visibleMessageCount}
            />

            {debate.follow_up_question ? (
              <section className="mb-5 rounded-md border border-sky-400/25 bg-sky-500/10 p-4 shadow-sm shadow-black/20 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Follow-up debate
                </p>
                <h2 className="mt-2 text-sm font-semibold text-slate-100">
                  当前追问
                </h2>
                <p className="mt-2 break-words border-l-2 border-sky-400 pl-3 text-sm leading-6 text-slate-200">
                  {debate.follow_up_question}
                </p>
                {debate.parent_debate_id ? (
                  <Link
                    className="mt-4 inline-flex text-sm font-medium text-sky-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    href={`/debates/${debate.parent_debate_id}`}
                  >
                    查看父辩论 #{debate.parent_debate_id}
                  </Link>
                ) : null}
              </section>
            ) : null}

            {debate.status === "completed" ? (
              <FollowUpDebateForm
                debateId={debate.id}
                suggestedQuestions={debate.final_report?.follow_up_questions}
              />
            ) : null}

            <section className="mb-5 rounded-md border border-slate-800 bg-slate-950/80 p-4 shadow-sm shadow-black/20 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Markdown 报告
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    导出当前辩论的结论、关键观点、分歧和阶段记录。
                  </p>
                </div>
                <ReportActions debate={debate} />
              </div>
            </section>

            <DebateViewTabs onChange={setActiveView} value={activeView} />

            {activeView === "overview" ? (
              <div className="space-y-5">
                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                  <article className="min-w-0 rounded-md border border-slate-800 bg-slate-950/80 p-4 shadow-sm shadow-black/20 sm:p-5">
                    <h2 className="mb-4 text-lg font-semibold text-slate-100">
                      {isTopicDebate ? "话题背景" : "文章"}
                    </h2>
                    {!isTopicDebate && debate.article.source ? (
                      <p className="mb-2 break-words text-sm text-slate-400">
                        来源：{debate.article.source}
                      </p>
                    ) : null}
                    {debate.article.user_question ? (
                      <p className="mb-4 break-words border-l-4 border-violet-400 pl-3 text-sm leading-6 text-slate-300">
                        关注问题：{debate.article.user_question}
                      </p>
                    ) : null}
                    <p className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words pr-1 text-sm leading-7 text-slate-300">
                      {debate.article.content}
                    </p>
                  </article>

                  <aside className="min-w-0 rounded-md border border-slate-800 bg-slate-950/80 p-4 shadow-sm shadow-black/20 sm:p-5">
                    <h2 className="mb-4 text-lg font-semibold text-slate-100">
                      辩论概要
                    </h2>
                    <KeyValue label="核心主张" value={debate.main_claim} />
                    <KeyValue label="辩题" value={debate.debate_topic} />
                    <KeyValue label="辩论深度" value={formatDebateDepth(debate.debate_depth)} />
                    <KeyValue label="输出风格" value={formatOutputStyle(debate.output_style)} />
                    <KeyValue label="阶段模式" value={formatStageMode(debate.stage_mode, isTopicDebate)} />
                    <KeyValue label="创建时间" value={formatDate(debate.created_at)} />
                    <KeyValue label="更新时间" value={formatDate(debate.updated_at)} />
                  </aside>
                </section>

                <DisagreementMap messages={debate.messages} />
              </div>
            ) : null}

            {activeView === "process" ? (
              <div className="space-y-5">
                <DebateStageProgress
                  messages={debate.messages}
                  mode={debateMode}
                  status={debate.status}
                />

                <section className="rounded-md border border-slate-800 bg-slate-950/80 p-4 shadow-sm shadow-black/20 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-100">
                      {stageOrder.length} 阶段消息
                    </h2>
                    <span className="text-sm text-slate-400">
                      {visibleMessageCount} 条输出
                    </span>
                  </div>
                  <DebateStage messages={debate.messages} mode={debateMode} />
                </section>
              </div>
            ) : null}

            {activeView === "report" ? (
              <section className="rounded-md border border-slate-800 bg-slate-950/80 p-4 shadow-sm shadow-black/20 sm:p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-100">
                  最终裁判报告
                </h2>
                <JudgeReport report={debate.final_report} />
              </section>
            ) : null}
          </>
        ) : null}
        </div>
      </main>
    </>
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
      <p className="break-words text-sm leading-6 text-slate-200">
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
      ? "border-rose-400/35 bg-rose-500/10 text-rose-100"
      : "border-slate-800 bg-slate-950/80 text-slate-300";

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

function getDebateMode(debate: DebateDetailRead): DebateStageMode {
  if (debate.stage_mode === "topic_3") {
    return "topic_3";
  }

  if (debate.stage_mode === "topic_5") {
    return "topic";
  }

  if (debate.stage_mode === "article_9") {
    return "article";
  }

  return debate.article.source === "topic" ? "topic" : "article";
}

function formatDebateDepth(value: DebateDetailRead["debate_depth"]) {
  if (value === "quick") {
    return "快速";
  }

  if (value === "deep") {
    return "深度";
  }

  if (value === "standard") {
    return "标准";
  }

  return null;
}

function formatOutputStyle(value: DebateDetailRead["output_style"]) {
  if (value === "concise") {
    return "简洁";
  }

  if (value === "detailed") {
    return "详细";
  }

  return null;
}

function formatStageMode(
  value: DebateDetailRead["stage_mode"],
  isTopicDebate?: boolean,
) {
  if (value === "topic_3") {
    return "话题 3 阶段极简";
  }

  if (value === "topic_5") {
    return "话题 5 阶段标准";
  }

  if (value === "article_9") {
    return "文章 9 阶段";
  }

  return isTopicDebate ? "话题 5 阶段标准" : "文章 9 阶段";
}
