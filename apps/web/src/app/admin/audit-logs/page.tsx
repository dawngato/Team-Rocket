"use client";

import React, { useState } from "react";
import { ShieldCheck, Search, Filter } from "lucide-react";
import { INITIAL_AUDIT_EVENTS } from "@/lib/mock_data";
import { AuditEvent } from "@/lib/types";

export default function AdminAuditLogsPage() {
  const [logs] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = logs.filter((l) => {
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Append Only Audit Trail
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Security and Operational Logs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Tamper evident ledger of all authority events, checkpoint cosignatures, and nullifier collision attempts.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-[#132135] p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or details..."
            aria-label="Search audit logs"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</span>
          {["ALL", "PASS", "FAIL"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`min-h-[44px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st
                  ? "bg-[#157E92] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Events */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#1E3352] text-slate-500 uppercase tracking-wider font-semibold">
                <th scope="col" className="px-6 py-4">Timestamp (UTC)</th>
                <th scope="col" className="px-6 py-4">Action</th>
                <th scope="col" className="px-6 py-4">Actor</th>
                <th scope="col" className="px-6 py-4">Outcome</th>
                <th scope="col" className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp_utc).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-[#10233F] dark:text-white">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 font-mono text-[#157E92]">
                    {log.actor}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                        log.status === "PASS"
                          ? "bg-[#15805D]/10 text-[#15805D]"
                          : "bg-[#C23C45]/10 text-[#C23C45]"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
