"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DebateList } from "@/components/debate-list";
import { deleteDebate, listDebates } from "@/lib/api";
import type { DebateListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDebateId, setDeletingDebateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadDebates() {
      try {
        setLoading(true);
        setError(null);
        const data = await listDebates();
        if (alive) {
          setDebates(data);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "最近辩论加载失败。");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadDebates();
    return () => {
      alive = false;
    };
  }, []);

  async function handleDeleteDebate(debate: DebateListItem) {
    const confirmed = window.confirm(`确定删除这场辩论吗？\n\n${debate.title}`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingDebateId(debate.id);
      setError(null);
      await deleteDebate(debate.id);
      setDebates((current) => current.filter((item) => item.id !== debate.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除辩论失败。");
    } finally {
      setDeletingDebateId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:py-10">
      <section className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-slate-500">
            Multi Agent Debate
          </p>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            文章辩论工作台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            粘贴一篇文章，系统会组织主持人、正方、反方和裁判完成 9
            阶段审议，帮助你判断观点是否可靠。
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          href="/debates/new"
        >
          新建辩论
        </Link>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">最近辩论</h2>
          <span className="text-sm text-slate-500">{debates.length} 场</span>
        </div>

        {loading ? <StateMessage text="正在加载最近辩论..." /> : null}
        {error ? <StateMessage tone="error" text={error} /> : null}
        {!loading && !error ? (
          <DebateList
            deletingDebateId={deletingDebateId}
            debates={debates}
            emptyMessage="还没有辩论。先创建一场新的文章辩论。"
            onDeleteDebate={handleDeleteDebate}
            onSelectDebate={(debate) => router.push(`/debates/${debate.id}`)}
          />
        ) : null}
      </section>
    </main>
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
    <div className={`rounded-md border px-4 py-5 text-sm leading-6 ${toneClass}`}>
      {text}
    </div>
  );
}
