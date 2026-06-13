"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listDebates } from "@/lib/api";
import type { DebateListItem } from "@/lib/types";

const featureCards = [
  {
    mark: "AI",
    title: "文章深度辩论",
    description: "围绕一篇文章拆解主张、证据、反驳和可信度。",
  },
  {
    mark: "Q",
    title: "快速话题辩论",
    description: "输入一个问题，让正反方迅速展开多阶段交锋。",
  },
  {
    mark: "VS",
    title: "正反方交锋",
    description: "主持人、正方、反方和裁判各司其职，过程清晰可追踪。",
  },
  {
    mark: "MAP",
    title: "争议点地图",
    description: "把双方真正分歧放到同一张结构化视图里。",
  },
  {
    mark: "J",
    title: "裁判报告",
    description: "输出结论、判定依据、可信部分和存疑部分。",
  },
  {
    mark: "MD",
    title: "Markdown 导出",
    description: "把分析结果保存成可归档、可复制、可继续编辑的报告。",
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

export default function HomePage() {
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadDebateStats() {
      try {
        setStatsLoading(true);
        setStatsError(null);
        const data = await listDebates();
        if (alive) {
          setDebates(data);
        }
      } catch (err) {
        if (alive) {
          setStatsError(err instanceof Error ? err.message : "统计加载失败");
        }
      } finally {
        if (alive) {
          setStatsLoading(false);
        }
      }
    }

    loadDebateStats();
    return () => {
      alive = false;
    };
  }, []);

  const runningDebates = debates.filter(
    (debate) => debate.status === "pending" || debate.status === "running",
  ).length;
  const completedDebates = debates.filter((debate) => debate.status === "completed").length;
  const recentDebates = debates.slice(0, 3);

  return (
    <main className="min-h-screen text-neutral-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link className="flex items-center gap-2 text-sm font-semibold text-white" href="/">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white text-sm font-black text-black">
            M
          </span>
          Multi Agent Debate
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-neutral-400 md:flex">
          <Link className="transition hover:text-white" href="/articles">
            文章库
          </Link>
          <Link className="transition hover:text-white" href="/debates">
            历史辩论
          </Link>
          <Link className="transition hover:text-white" href="/debates/topic/new">
            话题辩论
          </Link>
        </nav>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-purple-600 px-4 text-sm font-semibold text-white transition hover:bg-purple-500"
          href="/debates/new"
        >
          开始辩论
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-16 lg:pt-16">
        <div className="min-w-0 text-center lg:text-left">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-purple-300">
            AI Debate Workspace
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl lg:mx-0 lg:text-6xl">
            让多个 Agent 替你思考、交锋、裁判
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-neutral-300 lg:mx-0">
            输入文章或话题，系统会组织主持人、正方、反方和裁判完成多阶段辩论，最后生成可导出的结构化报告。
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

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.78fr_1.22fr]">
        <WorkspaceOverview
          completedDebates={completedDebates}
          debates={debates}
          loading={statsLoading}
          recentDebates={recentDebates}
          runningDebates={runningDebates}
          statsError={statsError}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              className="rounded-md border border-neutral-800 bg-neutral-900 p-5 transition hover:border-purple-500/70 hover:bg-neutral-800"
              key={feature.title}
            >
              <div className="mb-5 inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-purple-400/30 bg-purple-500/10 px-2 text-xs font-black text-purple-300">
                {feature.mark}
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
  recentDebates,
  runningDebates,
  statsError,
}: {
  completedDebates: number;
  debates: DebateListItem[];
  loading: boolean;
  recentDebates: DebateListItem[];
  runningDebates: number;
  statsError: string | null;
}) {
  return (
    <aside className="rounded-md border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm font-semibold text-purple-300">工作台</p>
      <h2 className="mt-1 text-xl font-semibold text-white">辩论概览</h2>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric label="辩论总数" value={loading ? "-" : String(debates.length)} />
        <Metric label="进行中" value={loading ? "-" : String(runningDebates)} />
        <Metric label="已完成" value={loading ? "-" : String(completedDebates)} />
      </div>

      {statsError ? (
        <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-200">
          {statsError}
        </div>
      ) : null}

      <div className="mt-5 border-t border-neutral-800 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-200">最近记录</h3>
          <Link className="text-xs font-medium text-purple-300 hover:text-purple-200" href="/debates">
            全部
          </Link>
        </div>
        {recentDebates.length > 0 ? (
          <div className="space-y-2">
            {recentDebates.map((debate) => (
              <Link
                className="block rounded-md border border-neutral-800 bg-black/30 px-3 py-2 transition hover:border-neutral-600"
                href={`/debates/${debate.id}`}
                key={debate.id}
              >
                <div className="truncate text-sm font-medium text-neutral-100">
                  {debate.title}
                </div>
                <div className="mt-1 text-xs text-neutral-500">{debate.status}</div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-neutral-700 px-3 py-5 text-center text-sm text-neutral-500">
            还没有辩论记录。
          </p>
        )}
      </div>
    </aside>
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
