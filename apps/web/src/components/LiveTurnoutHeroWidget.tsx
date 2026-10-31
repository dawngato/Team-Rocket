"use client";

import { ShieldCheck } from "lucide-react";

/**
 * Turnout is intentionally not synthesized in the browser. A future live
 * widget must consume a privacy-reviewed aggregate endpoint.
 */
export function LiveTurnoutHeroWidget() {
  return <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex items-start gap-3"><ShieldCheck className="size-6 text-[#157E92] dark:text-[#38BDF8]" aria-hidden="true" /><div><h2 className="font-bold text-[#10233F] dark:text-white">Live turnout is not exposed here</h2><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Accepted-ballot aggregates must come from the authoritative election service. No browser timer, local storage value, or individual ballot event is treated as turnout.</p></div></div></div>;
}
