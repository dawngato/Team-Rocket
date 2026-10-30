"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { AuditEvent } from "@/lib/types";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void apiClient.getAuditEvents().then(setLogs).catch((cause) => setError(cause instanceof Error ? cause.message : "Audit API unavailable.")); }, []);
  const filtered = useMemo(() => logs.filter((log) => `${log.action} ${log.actor} ${log.details}`.toLowerCase().includes(search.toLowerCase())), [logs, search]);
  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#15805D]"><ShieldCheck className="size-4" aria-hidden="true" />Append-only audit trail</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Security and operational logs</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Events are loaded from the authenticated admin API. No seeded audit records are displayed.</p></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}<div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, actor or details" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent pl-9 pr-3 text-sm" /></div><div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1E3352]"><table className="w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-900/40"><tr><th className="px-5 py-4">Timestamp</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Actor</th><th className="px-5 py-4">Result</th><th className="px-5 py-4">Details</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">{filtered.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-5 py-4 font-mono">{new Date(log.timestamp_utc).toLocaleString()}</td><td className="px-5 py-4 font-mono font-bold">{log.action}</td><td className="px-5 py-4 font-mono text-[#157E92]">{log.actor}</td><td className="px-5 py-4">{log.status}</td><td className="px-5 py-4">{log.details}</td></tr>)}</tbody></table></div></main>;
}
