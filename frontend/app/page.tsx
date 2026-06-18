"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DebateStatus } from "@/components/debate-status";
import { SiteHeader } from "@/components/site-header";
import { listDebates } from "@/lib/api";
import type { DebateListItem } from "@/lib/types";

const debateFlowSteps = [
  {
    step: "01",
    title: "输入文章或话题",
    description: "提交完整文章进行深度分析，或输入一个话题快速启动讨论。",
  },
  {
    step: "02",
    title: "提取关注问题",
    description: "从输入中识别核心主张、用户关注点与真正需要回答的辩题。",
  },
  {
    step: "03",
    title: "主持人定义边界",
    description: "主持人明确概念、评价标准和争议范围，让双方围绕同一问题展开。",
  },
  {
    step: "04",
    title: "正反方多轮交锋",
    description: "正反方提出论点、证据与反驳，逐步暴露共识、分歧和推理漏洞。",
  },
  {
    step: "05",
    title: "裁判形成报告",
    description: "裁判综合双方表现，给出结论、可信度、存疑部分与可继续追问的方向。",
  },
] as const;

const exampleTopics = [
  {
    title: "AI 编程会不会降低初级程序员的价值？",
    question: "请重点比较学习曲线、岗位需求和长期职业成长。",
  },
  {
    title: "企业是否应该优先采用开源大模型？",
    question: "请从成本、数据安全、可控性和落地风险展开。",
  },
  {
    title: "远程办公会提升还是削弱团队创造力？",
    question: "请区分短期效率、协作质量和组织文化影响。",
  },
] as const;

function buildTopicHref(topic: string, question: string) {
  const params = new URLSearchParams({
    topic,
    user_question: question,
  });

  return `/debates/topic/new?${params.toString()}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function HomePage() {
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadDebates = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      setDebates(await listDebates());
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "工作台加载失败");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDebates();
  }, [loadDebates]);

  const runningDebates = debates.filter(
    (debate) => debate.status === "pending" || debate.status === "running",
  ).length;
  const completedDebates = debates.filter((debate) => debate.status === "completed").length;

  return (
    <main className="min-h-screen text-neutral-100">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-16 lg:pt-16">
        <div className="min-w-0 text-center lg:text-left">
          <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-purple-300">
            多 Agent 分析工作台
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl lg:mx-0 lg:text-6xl">
            让多个 Agent 替你思考、交锋、裁判
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-neutral-300 lg:mx-0">
            输入文章或一个具体问题，交给主持人、正方、反方和裁判完成多阶段分析，得到可检查、可导出的结论。
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-purple-600 px-5 text-sm font-semibold text-white transition hover:bg-purple-500"
              href="/debates/new"
            >
              开始文章辩论
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 px-5 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
              href="/debates/topic/new"
            >
              快速话题辩论
            </Link>
          </div>
        </div>

        <HeroEditorPreview />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <WorkspaceOverview
          completedDebates={completedDebates}
          debates={debates}
          loading={statsLoading}
          onRetry={loadDebates}
          runningDebates={runningDebates}
          statsError={statsError}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-5 max-w-2xl">
          <p className="text-sm font-semibold text-purple-300">辩论流程</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">从输入问题到可检查的裁判报告</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            每场辩论沿着明确的分析链路推进，过程和最终依据都可以回看。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {debateFlowSteps.map((feature) => (
            <article
              className="rounded-md border border-neutral-800 bg-neutral-900 p-5 transition hover:border-purple-500/70 hover:bg-neutral-800"
              key={feature.title}
            >
              <div className="mb-5 text-xs font-semibold tracking-[0.2em] text-purple-300">
                {feature.step}
              </div>
              <h2 className="text-base font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-purple-300">示例入口</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              从一个推荐问题开始
            </h2>
          </div>
          <Link
            className="inline-flex h-9 items-center rounded-md border border-neutral-700 px-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
            href="/debates"
          >
            查看历史辩论
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {exampleTopics.map((example) => (
            <Link
              className="rounded-md border border-neutral-800 bg-neutral-950 p-4 transition hover:border-purple-500/70 hover:bg-neutral-900"
              href={buildTopicHref(example.title, example.question)}
              key={example.title}
            >
              <div className="mb-3 inline-flex rounded-md border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300">
                推荐
              </div>
              <div className="text-sm font-semibold leading-6 text-white">
                {example.title}
              </div>
              <div className="mt-2 text-sm leading-6 text-neutral-400">
                {example.question}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function HeroEditorPreview() {
  return (
    <aside className="relative">
      <div className="absolute -left-5 top-16 hidden text-5xl font-black text-purple-400 lg:block">
        *
      </div>
      <div className="absolute -right-3 -top-4 hidden rounded-md border border-purple-400/30 px-3 py-1 text-sm font-black uppercase tracking-widest text-purple-300 rotate-6 lg:block">
        Alpha
      </div>
      <div className="overflow-hidden rounded-md border border-neutral-700 bg-[#1b1b1d] shadow-2xl shadow-purple-950/20">
        <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs font-medium text-neutral-500">
            AI Assist: Debate brief
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Debate Brief
          </h2>
          <div className="mt-6 rounded-md border border-neutral-700 bg-[#252326] p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
              <span>AI assist: Brainstorm arguments</span>
              <span>Learn more</span>
            </div>
            <div className="rounded border border-blue-500 bg-[#2a282b] px-3 py-3 text-sm leading-6 text-neutral-100 shadow-[0_0_0_1px_rgba(29,155,240,0.25)]">
              远程办公会提升还是削弱团队创造力？
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                className="inline-flex h-9 items-center justify-center rounded bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                href={buildTopicHref(
                  "远程办公会提升还是削弱团队创造力？",
                  "请区分短期效率、协作质量和组织文化影响。",
                )}
              >
                Generate
              </Link>
              <button
                className="inline-flex h-9 items-center justify-center rounded border border-neutral-700 px-3 text-sm font-medium text-neutral-300"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <PreviewLine label="正方" text="远程办公扩大深度工作时间，减少通勤和低效打断。" />
            <PreviewLine label="反方" text="创造力依赖高带宽协作，弱连接会更快衰减。" />
            <PreviewLine label="裁判" text="结论取决于团队成熟度、协作协议和反馈节奏。" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function PreviewLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-black/35 p-3">
      <div className="mb-1 text-xs font-semibold text-purple-300">{label}</div>
      <p className="text-sm leading-6 text-neutral-300">{text}</p>
    </div>
  );
}

function WorkspaceOverview({
  completedDebates,
  debates,
  loading,
  onRetry,
  runningDebates,
  statsError,
}: {
  completedDebates: number;
  debates: DebateListItem[];
  loading: boolean;
  onRetry: () => Promise<void>;
  runningDebates: number;
  statsError: string | null;
}) {
  const activeDebates = debates
    .filter((debate) => debate.status === "pending" || debate.status === "running")
    .slice(0, 3);
  const recentCompleted = debates
    .filter((debate) => debate.status === "completed")
    .slice(0, 3);

  return (
    <section className="rounded-md border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-300">继续工作</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">回到正在推进的分析</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            优先查看排队中和辩论中的任务，也可以快速回看最近结论。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
          <Metric label="全部" value={loading ? "-" : String(debates.length)} />
          <Metric label="进行中" value={loading ? "-" : String(runningDebates)} />
          <Metric label="已完成" value={loading ? "-" : String(completedDebates)} />
        </div>
      </div>

      {statsError ? (
        <div className="mt-5 flex flex-col gap-3 rounded-md border border-red-400/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-100">工作台暂时无法加载</p>
            <p className="mt-1 text-sm text-red-200/80">{statsError}</p>
          </div>
          <button
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-red-300/30 px-3 text-sm font-semibold text-red-100 outline-none transition hover:bg-red-400/10 focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-wait disabled:opacity-60"
            disabled={loading}
            onClick={() => void onRetry()}
            type="button"
          >
            {loading ? "重新加载中" : "重新加载"}
          </button>
        </div>
      ) : loading ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2" aria-live="polite">
          <WorkspaceSkeleton title="正在进行" />
          <WorkspaceSkeleton title="最近完成" />
        </div>
      ) : debates.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <DebateGroup
            debates={activeDebates}
            emptyText="当前没有进行中的辩论。"
            title="正在进行"
          />
          <DebateGroup
            debates={recentCompleted}
            emptyText="还没有已完成的辩论。"
            title="最近完成"
          />
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-neutral-700 bg-black/25 px-5 py-8 text-center">
          <h3 className="text-base font-semibold text-white">从第一场辩论开始</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-400">
            提交一篇文章做完整分析，或直接用一个问题快速试跑多 Agent 交锋。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-purple-600 px-4 text-sm font-semibold text-white transition hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              href="/debates/new"
            >
              开始文章辩论
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-700 px-4 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              href="/debates/topic/new"
            >
              快速话题辩论
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function DebateGroup({
  debates,
  emptyText,
  title,
}: {
  debates: DebateListItem[];
  emptyText: string;
  title: string;
}) {
  return (
    <div className="rounded-md border border-neutral-800 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
        <Link
          className="rounded text-xs font-medium text-purple-300 outline-none hover:text-purple-200 focus-visible:ring-2 focus-visible:ring-purple-400"
          href="/debates"
        >
          查看全部
        </Link>
      </div>
      {debates.length > 0 ? (
        <div className="space-y-2">
          {debates.map((debate) => (
            <Link
              className="block rounded-md border border-neutral-800 bg-neutral-950 px-3 py-3 outline-none transition hover:border-purple-500/60 hover:bg-neutral-900 focus-visible:ring-2 focus-visible:ring-purple-400"
              href={`/debates/${debate.id}`}
              key={debate.id}
            >
              <div className="truncate text-sm font-medium text-neutral-100">{debate.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DebateStatus status={debate.status} />
                <span className="text-xs text-neutral-500">文章 #{debate.article_id}</span>
                <span className="text-xs text-neutral-500">{formatDate(debate.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function WorkspaceSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-black/25 p-4">
      <h3 className="text-sm font-semibold text-neutral-300">{title}</h3>
      <div className="mt-3 space-y-2">
        {[0, 1].map((item) => (
          <div className="h-[68px] animate-pulse rounded-md bg-neutral-800/70" key={item} />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-black/35 px-3 py-3 text-center">
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
    </div>
  );
}
