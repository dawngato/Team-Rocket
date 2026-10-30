"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import {
  adminApprovalsClient,
  AdminApprovalApiError,
  type RoleApproval,
} from "@/lib/admin_approvals";

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<RoleApproval[] | null>(null);
  const [error, setError] = useState<AdminApprovalApiError | null>(null);

  const loadApprovals = () => {
    setApprovals(null);
    setError(null);
    void adminApprovalsClient.getPendingApprovals().then(setApprovals).catch((cause) => {
      setError(
        cause instanceof AdminApprovalApiError
          ? cause
          : new AdminApprovalApiError({
              code: "ADMIN_APPROVAL_LOAD_FAILED",
              message: "The approval queue could not be loaded safely.",
              status: 503,
            }),
      );
    });
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] mb-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            Governance Gate
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Role Grant Approvals
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Dual authority approval for elevated permissions. Self approval is blocked by institutional policy.
          </p>
        </div>
      </div>

      {error ? (
        <section
          role="alert"
          className="rounded-xl border border-[#AA6C0B]/40 bg-[#AA6C0B]/10 p-6 space-y-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#AA6C0B]" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="font-bold text-[#6B4707] dark:text-[#FBBF24]">Approval queue unavailable</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                The identity service does not currently provide an authorized pending-approval list. No local or seeded requests are shown, and no approval decision can be submitted from this page.
              </p>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400">{error.code}: {error.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadApprovals}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-[#10233F] dark:text-white border border-[#AA6C0B]/40 rounded-lg hover:bg-[#AA6C0B]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AA6C0B] inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Check again
          </button>
        </section>
      ) : approvals === null ? (
        <section role="status" className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-400">
          <Clock className="w-5 h-5 animate-pulse mb-3" aria-hidden="true" />
          Loading the authoritative approval queue…
        </section>
      ) : approvals.length === 0 ? (
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-400">
          The authoritative approval queue is empty.
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 text-sm text-slate-600 dark:text-slate-400">
          Approval records were returned, but this client has no safe decision workflow for rendering them yet. No action was taken.
        </section>
      )}
    </div>
  );
}
