"use client";

import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { apiClient } from "@/lib/api_client";
import type { AuditEvent } from "@/lib/types";

export default function SuperAdminSystemAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void apiClient.getAuditEvents().then(setEvents).catch((cause) => setError(cause instanceof Error ? cause.message : "Audit API unavailable.")); }, []);
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]"><FileText className="size-4" aria-hidden="true" />Immutable audit trail</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">System audit log</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Authoritative events are read from the authenticated admin service.</p></header><SuperAdminNav />{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}<div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1E3352]"><table className="w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-900/40"><tr><th className="px-5 py-4">Timestamp</th><th className="px-5 py-4">Actor</th><th className="px-5 py-4">Action</th><th className="px-5 py-4">Result</th><th className="px-5 py-4">Details</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">{events.map((event) => <tr key={event.id}><td className="px-5 py-4 font-mono">{new Date(event.timestamp_utc).toLocaleString()}</td><td className="px-5 py-4 font-mono">{event.actor}</td><td className="px-5 py-4 font-mono font-bold text-[#157E92]">{event.action}</td><td className="px-5 py-4">{event.status}</td><td className="px-5 py-4">{event.details}</td></tr>)}</tbody></table></div></main>;
}
