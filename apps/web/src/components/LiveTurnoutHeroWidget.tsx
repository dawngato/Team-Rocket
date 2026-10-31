import Link from "next/link";
import { AlertTriangle, ArrowRight, Database, FileCheck2, ShieldCheck } from "lucide-react";

const readinessItems = [
  {
    icon: ShieldCheck,
    label: "Ballot protocol",
    value: "Development engine",
    status: "Not independently reviewed",
  },
  {
    icon: Database,
    label: "Checkpoint witness",
    value: "Local simulation",
    status: "External custody not configured",
  },
  {
    icon: FileCheck2,
    label: "Result verification",
    value: "Offline verifier included",
    status: "Requires trusted published evidence",
  },
];

export function ElectionReadinessPanel() {
  return (
    <section
      aria-labelledby="readiness-heading"
      className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-cyan-500/30 dark:bg-gradient-to-b dark:from-[#0a1829] dark:to-[#040c17] dark:shadow-2xl dark:shadow-cyan-950/50 sm:p-6"
    >
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
            Educational prototype
          </p>
          <h2 id="readiness-heading" className="mt-1 text-base font-bold text-slate-900 dark:text-white">
            Verification readiness
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            No live turnout, voter counts, or election results are displayed here.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-white/10">
        {readinessItems.map(({ icon: Icon, label, value, status }) => (
          <li key={label} className="flex gap-3 py-4">
            <Icon className="mt-0.5 size-4 shrink-0 text-[#157E92] dark:text-cyan-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{value}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{status}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/security-limits"
        className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#157E92] hover:underline dark:text-cyan-300"
      >
        Review security limits <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
