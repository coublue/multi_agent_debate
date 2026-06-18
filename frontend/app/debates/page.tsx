"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DebateList } from "@/components/debate-list";
import { PageBackLink } from "@/components/page-back-link";
import { SiteHeader } from "@/components/site-header";
import { deleteDebate, listDebates } from "@/lib/api";
import type { DebateListItem, DebateStatus } from "@/lib/types";

type DebateStatusFilter = "all" | DebateStatus;
type DebateSortKey = "created_at" | "credibility_score";

const STATUS_FILTERS: Array<{ label: string; value: DebateStatusFilter }> = [
  { label: "全部", value: "all" },
  { label: "排队中", value: "pending" },
  { label: "辩论中", value: "running" },
  { label: "已完成", value: "completed" },
  { label: "失败", value: "failed" },
];

const SORT_OPTIONS: Array<{ label: string; value: DebateSortKey }> = [
  { label: "创建时间", value: "created_at" },
  { label: "可信度评分", value: "credibility_score" },
];

const STATUS_LABELS: Record<DebateStatus, string> = {
  pending: "排队中",
  running: "辩论中",
  completed: "已完成",
  failed: "失败",
};

const WINNER_LABELS: Record<string, string> = {
  balanced: "均衡结论",
  con: "反方",
  mixed: "综合结论",
  pro: "正方",
};

export default function DebatesPage() {
  const router = useRouter();
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDebateId, setDeletingDebateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DebateStatusFilter>("all");
  const [sortKey, setSortKey] = useState<DebateSortKey>("created_at");

  const filteredDebates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return debates
      .filter((debate) => {
        if (statusFilter === "all") {
          return true;
        }
        return debate.status === statusFilter;
      })
      .filter((debate) => {
        if (!query) {
          return true;
        }
        return [
          debate.title,
          String(debate.article_id),
          debate.winner,
          debate.winner ? WINNER_LABELS[debate.winner] : null,
          debate.status,
          STATUS_LABELS[debate.status],
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((left, right) => compareDebates(left, right, sortKey));
  }, [debates, searchTerm, sortKey, statusFilter]);

  const completedCount = debates.filter((debate) => debate.status === "completed").length;
  const runningCount = debates.filter(
    (debate) => debate.status === "pending" || debate.status === "running",
  ).length;
  const failedCount = debates.filter((debate) => debate.status === "failed").length;

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
          setError(err instanceof Error ? err.message : "辩论列表加载失败。");
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-5">
          <PageBackLink href="/" label="返回首页" />
        </div>

        <section className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-7 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium text-cyan-300">Debate Workspace</p>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              最近辩论
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              查看所有辩论记录，按标题、文章编号、状态或结论搜索，并快速进入详情页。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span>{debates.length} 场</span>
            <span className="text-slate-700">/</span>
            <span>{completedCount} 已完成</span>
            <span className="text-slate-700">/</span>
            <span>{runningCount} 进行中</span>
            <span className="text-slate-700">/</span>
            <span>{failedCount} 失败</span>
          </div>
        </section>

        <section className="rounded-md border border-slate-800 bg-slate-900/60 p-4 shadow-sm shadow-black/20 sm:p-5">
          {loading ? <StateMessage text="正在加载辩论列表..." /> : null}
          {error ? <StateMessage tone="error" text={error} /> : null}
          {!loading && !error ? (
            <div className="space-y-4">
              <DebateLibraryControls
                resultCount={filteredDebates.length}
                searchTerm={searchTerm}
                sortKey={sortKey}
                statusFilter={statusFilter}
                totalCount={debates.length}
                onSearchTermChange={setSearchTerm}
                onSortKeyChange={setSortKey}
                onStatusFilterChange={setStatusFilter}
              />
              <DebateList
                debates={filteredDebates}
                deletingDebateId={deletingDebateId}
                emptyMessage="没有符合当前筛选条件的辩论。"
                onDeleteDebate={handleDeleteDebate}
                onSelectDebate={(debate) => router.push(`/debates/${debate.id}`)}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function DebateLibraryControls({
  resultCount,
  searchTerm,
  sortKey,
  statusFilter,
  totalCount,
  onSearchTermChange,
  onSortKeyChange,
  onStatusFilterChange,
}: {
  resultCount: number;
  searchTerm: string;
  sortKey: DebateSortKey;
  statusFilter: DebateStatusFilter;
  totalCount: number;
  onSearchTermChange: (value: string) => void;
  onSortKeyChange: (value: DebateSortKey) => void;
  onStatusFilterChange: (value: DebateStatusFilter) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <button
              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${
                isActive
                  ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
              }`}
              key={filter.value}
              onClick={() => onStatusFilterChange(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-400">
            搜索标题、文章编号、状态或结论
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="输入关键词"
            value={searchTerm}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-400">排序</span>
          <select
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
            onChange={(event) => onSortKeyChange(event.target.value as DebateSortKey)}
            value={sortKey}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="text-xs text-slate-500">
        当前显示 {resultCount} 场，共 {totalCount} 场；缺少评分的辩论会排在后面。
      </div>
    </div>
  );
}

function compareDebates(left: DebateListItem, right: DebateListItem, sortKey: DebateSortKey) {
  const leftValue = getSortValue(left, sortKey);
  const rightValue = getSortValue(right, sortKey);
  const leftCreatedAt = getSortValue(left, "created_at") ?? 0;
  const rightCreatedAt = getSortValue(right, "created_at") ?? 0;

  if (leftValue === null && rightValue === null) {
    return rightCreatedAt - leftCreatedAt;
  }
  if (leftValue === null) {
    return 1;
  }
  if (rightValue === null) {
    return -1;
  }
  if (rightValue !== leftValue) {
    return rightValue - leftValue;
  }
  return rightCreatedAt - leftCreatedAt;
}

function getSortValue(debate: DebateListItem, sortKey: DebateSortKey): number | null {
  if (sortKey === "credibility_score") {
    return typeof debate.credibility_score === "number" ? debate.credibility_score : null;
  }

  const timestamp = new Date(debate.created_at).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
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
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-slate-800 bg-slate-950/70 text-slate-400";

  return <div className={`rounded-md border px-4 py-5 text-sm leading-6 ${toneClass}`}>{text}</div>;
}
