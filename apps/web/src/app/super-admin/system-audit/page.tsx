"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileText, ShieldCheck, Search, Activity, Database } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { apiClient } from "@/lib/api_client";
import type { AuditEvent } from "@/lib/types";

export default function SuperAdminSystemAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient
      .getAuditEvents()
      .then(setEvents)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "The audit log service is temporarily unreachable.")
      );
  }, []);

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (ev) =>
        ev.action.toLowerCase().includes(q) ||
        ev.actor.toLowerCase().includes(q) ||
        (ev.details && ev.details.toLowerCase().includes(q)) ||
        (ev.status && ev.status.toLowerCase().includes(q))
    );
  }, [events, search]);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Super Admin", href: "/super-admin" },
          { label: "System Audit Log" },
        ]}
      />

      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]">
              <FileText className="size-4" aria-hidden="true" />
              Administration Event Log
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
              System Audit &amp; Event Log
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Events returned by the authenticated admin service. This page does not verify log integrity or event signatures.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Service Snapshot</span>
          </div>
        </div>
      </header>

      <SuperAdminNav />

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recorded Invariant Events</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              {events.length}
            </div>
            <span className="text-[11px] text-slate-500">Events returned by the service</span>
          </div>
          <div className="p-3 rounded-xl bg-[#157E92]/10 text-[#157E92]">
            <Activity className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ledger Integrity Status</span>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1.5">
              <Activity className="size-6" />
              <span>Not verified</span>
            </div>
            <span className="text-[11px] text-slate-500">No chain integrity check was performed</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <ShieldCheck className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actor Signature Schema</span>
            <div className="text-lg font-bold font-mono text-[#10233F] dark:text-white mt-1">
              Not reported
            </div>
            <span className="text-[11px] text-slate-500">Signature algorithm and key ownership are not verified here</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Database className="size-5" />
          </div>
        </motion.div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by action identifier, actor principal, status, or details..."
          className="min-h-11 w-full rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] pl-10 pr-4 text-sm text-[#10233F] dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
        />
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1E3352]">
            <tr>
              <th className="px-5 py-4">Timestamp (UTC)</th>
              <th className="px-5 py-4">Actor Principal</th>
              <th className="px-5 py-4">Action Identifier</th>
              <th className="px-5 py-4">Result Status</th>
              <th className="px-5 py-4">Ledger Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  {events.length === 0 ? "No audit events were returned by the service." : "No entries matched your search criteria."}
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  className="transition-all duration-150 hover:bg-[#F5F2EB]/80 dark:hover:bg-stone-900/80 hover:shadow-sm"
                >
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-slate-600 dark:text-slate-400">
                    {new Date(event.timestamp_utc).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-white">
                    {event.actor}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-[#157E92] dark:text-[#38BDF8]">
                    {event.action}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {event.status || "Not reported"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 max-w-md truncate">
                    {event.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
