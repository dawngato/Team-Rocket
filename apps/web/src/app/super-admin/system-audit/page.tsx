"use client";

import React, { useState } from "react";
import { FileText, ShieldCheck, Filter, Download } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { INITIAL_AUDIT_EVENTS } from "@/lib/mock_data";

export default function SuperAdminSystemAuditPage() {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredEvents = INITIAL_AUDIT_EVENTS.filter((e) => {
    if (filterStatus === "ALL") return true;
    return e.status === filterStatus;
  });

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(INITIAL_AUDIT_EVENTS, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_system_audit_log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <FileText className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Immutable Audit Trail
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            System Audit Log
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Tamper evident ledger of governance actions, cluster events, and cryptographic checks.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Export Audit Log</span>
        </button>
      </div>

      <SuperAdminNav />

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filter Status:</span>
        {["ALL", "PASS", "FAIL", "WARNING"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`min-h-[36px] px-3 py-1 rounded text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
              filterStatus === status
                ? "bg-[#10233F] text-white dark:bg-[#157E92]"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Timestamp (UTC)</th>
                <th scope="col" className="px-6 py-3">Actor</th>
                <th scope="col" className="px-6 py-3">Action</th>
                <th scope="col" className="px-6 py-3">Resource</th>
                <th scope="col" className="px-6 py-3">Result</th>
                <th scope="col" className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-xs font-mono">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {new Date(evt.timestamp_utc).toISOString().replace("T", " ").replace("Z", "")}
                  </td>
                  <td className="px-6 py-4 font-bold text-[#10233F] dark:text-white">
                    {evt.actor}
                  </td>
                  <td className="px-6 py-4 text-[#157E92] dark:text-[#38BDF8] font-bold">
                    {evt.action}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {evt.resource_id}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        evt.status === "PASS"
                          ? "bg-[#15805D]/10 text-[#15805D]"
                          : evt.status === "FAIL"
                          ? "bg-[#C23C45]/10 text-[#C23C45]"
                          : "bg-[#AA6C0B]/10 text-[#AA6C0B]"
                      }`}
                    >
                      {evt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-sans text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {evt.details}
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
