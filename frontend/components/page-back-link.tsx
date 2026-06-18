import Link from "next/link";

export function PageBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-400 outline-none transition hover:bg-slate-900 hover:text-white focus-visible:ring-2 focus-visible:ring-purple-400"
      href={href}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
