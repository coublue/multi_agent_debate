"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listDebates } from "@/lib/api";
import type { DebateListItem } from "@/lib/types";

const workflowSteps = [
  {
    title: "输入内容",
    description: "粘贴文章，或输入一个需要判断的话题。",
  },
  {
    title: "Agent 分析",
    description: "主持人提炼焦点，并分配正反方视角。",
  },
  {
    title: "阶段辩论",
    description: "不同角色按阶段展开论证、反驳和收束。",
  },
  {
    title: "裁判报告",
    description: "裁判汇总结论、可信度和关键分歧。",
  },
  {
    title: "导出 Markdown",
    description: "将结果保存为便于归档的 Markdown。",
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:py-9">
      <section className="grid gap-8 pb-8 lg:grid-cols-[1.4fr_0.75fr] lg:items-center">
        <div className="min-w-0">
          <p className="mb-3 text-sm font-medium text-slate-500">
            Multi Agent Debate
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">
            本地文章审读与多 Agent 观点辩论助手
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            把文章或话题交给 4 个 Agent，从正反观点、证据强弱和可信度三个角度生成一份可导出的分析报告。
          </p>

          <HeroActions />
        </div>

        <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">工作台</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">辩论概览</h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <Metric label="辩论总数" value={statsLoading ? "-" : String(debates.length)} />
            <Metric label="进行中" value={statsLoading ? "-" : String(runningDebates)} />
            <Metric label="已完成" value={statsLoading ? "-" : String(completedDebates)} />
          </div>

          {statsError ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {statsError}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            <Link
              className="text-sm font-medium text-slate-700 hover:text-slate-950"
              href="/articles"
            >
              进入文章库
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              className="text-sm font-medium text-slate-700 hover:text-slate-950"
              href="/debates"
            >
              搜索历史辩论
            </Link>
          </div>
        </aside>
      </section>

      <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">新手路径</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              从输入到报告的五步流程
            </h2>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href="/debates/new"
          >
            立即开始
          </Link>
        </div>

        <WorkflowAnimation />
      </section>

      <section className="grid gap-5 py-7 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">示例入口</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            试一个推荐问题
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            不知道从哪里开始时，直接选择一个问题进入快速话题辩论。系统会自动填入话题和关注重点。
          </p>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            推荐从与你当前工作最接近的问题开始，再根据裁判报告调整关注点。
          </div>
        </div>

        <div className="grid gap-3">
          {exampleTopics.map((example) => (
            <Link
              className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              href={buildTopicHref(example.title, example.question)}
              key={example.title}
            >
              <div className="mb-2 inline-flex rounded-md border border-teal-100 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                推荐
              </div>
              <div className="text-sm font-semibold text-slate-950">{example.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {example.question}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function HeroActions() {
  return (
    <div className="mt-7">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/debates/new"
        >
          开始文章辩论
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          href="/debates/topic/new"
        >
          快速话题辩论
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <div className="text-lg font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function WorkflowAnimation() {
  return (
    <div className="relative mt-6">
      <div className="absolute left-8 right-8 top-7 hidden h-1 overflow-hidden rounded-full bg-slate-100 md:block">
        <div className="h-full w-1/3 animate-workflow-line rounded-full bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
        <div className="absolute inset-0 animate-workflow-glow bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {workflowSteps.map((step, index) => (
          <div
            className="group relative animate-workflow-card rounded-md border border-slate-200 bg-slate-50 p-3.5 transition hover:-translate-y-1 hover:scale-[1.02] hover:border-teal-300 hover:bg-white hover:shadow-md"
            key={step.title}
            style={{ animationDelay: `${index * 900}ms` }}
          >
            <div
              className="flex h-7 w-7 animate-workflow-node items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white shadow-sm transition group-hover:scale-110 group-hover:bg-teal-600 group-hover:shadow-teal-100"
              style={{ animationDelay: `${index * 900}ms` }}
            >
              {index + 1}
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-950">
              {step.title}
            </div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
