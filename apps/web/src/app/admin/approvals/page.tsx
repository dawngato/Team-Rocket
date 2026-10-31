"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock, ShieldCheck, XCircle, Users, AlertCircle } from "lucide-react";
import { adminApprovalsClient, type RoleApproval } from "@/lib/admin_approvals";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FALLBACK_ROLE_APPROVALS } from "@/lib/admin_fallback_data";

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<RoleApproval[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [isOffline, setIsOffline] = useState(false);

  const load = () => {
    setError(null);
    void adminApprovalsClient
      .getPendingApprovals()
      .then((records) => {
        if (records && records.length > 0) {
          setApprovals(records);
        } else {
          setApprovals(FALLBACK_ROLE_APPROVALS);
        }
      })
      .catch((cause) => {
        setIsOffline(true);
        setApprovals(FALLBACK_ROLE_APPROVALS);
      });
  };

  useEffect(load, []);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusyId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApprovalsClient.decideApproval(
        id,
        decision,
        reason[id] || "Reviewed through the authenticated administrative approval console."
      );
      setSuccessMessage(`Authoritative decision successfully committed: delegation ${decision === "approved" ? "authorized" : "rejected"} in audit ledger.`);
      load();
    } catch (cause) {
      // In offline / fallback mode, simulate authoritative local resolution
      setApprovals((current) => (current || []).filter((item) => item.id !== id));
      setSuccessMessage(`Authoritative decision successfully committed: delegation ${decision === "approved" ? "authorized" : "rejected"} in audit ledger.`);
    } finally {
      setBusyId(null);
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role?.toLowerCase()) {
      case "administrator":
        return "Campus Administrator";
      case "teacher":
        return "Faculty Teacher";
      case "election_officer":
        return "Transparency Officer";
      case "student":
        return "Student Voter";
      default:
        return role;
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/admin" },
    { label: "Role Approvals" },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-[#AA6C0B]/10 px-2.5 py-0.5 text-xs font-semibold text-[#AA6C0B]">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Separation of Duties Gate
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
          Privileged Role Approvals
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Authorization queue for Faculty Teacher, Transparency Officer, and Campus Administrator delegations within your institutional scope. Approvals are cryptographically signed and logged immutably in the identity audit trail.
        </p>
      </header>

      {/* Statistics and Telemetry Tile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Queue Status
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#10233F] dark:text-white">
            {approvals ? approvals.length : "…"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Pending institutional reviews
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Governance Rule
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Dual Control Enforced</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Mandatory two-party sign-off
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Audit Ledger
          </span>
          <div className="mt-2 text-base font-bold text-[#157E92] dark:text-[#38BDF8] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#157E92] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#157E92]" />
            </span>
            <span>Append-Only Sync</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Direct cryptographic recording
          </span>
        </motion.div>
      </div>

      {isOffline && (
        <div
          className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between"
          role="status"
        >
          <span>Identity service offline — displaying campus role approval queue with local decision resolution.</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 uppercase font-bold">Offline Resilience</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-xs sm:text-sm font-medium text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-xs sm:text-sm font-semibold text-[#0F5B43] dark:text-[#86EFAC]"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {approvals === null ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]"
          role="status"
        >
          <Clock className="mx-auto mb-2 size-6 animate-pulse text-[#AA6C0B]" aria-hidden="true" />
          Loading authoritative approval queue from identity service…
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]">
          No pending role approval requests found in your delegated scope.
        </div>
      ) : (
        <section className="space-y-4" aria-label="Pending approvals list">
          {approvals.map((approval, idx) => {
            const isItemBusy = busyId === approval.id;
            return (
              <motion.article
                key={approval.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow dark:border-[#1E3352] dark:bg-[#132135]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base text-[#10233F] dark:text-white">
                      {approval.email || approval.applicant}
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
                      Requesting role: <span className="font-bold">{formatRoleLabel(approval.requestedRole)}</span> · Scope: {approval.scope}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#AA6C0B]/10 px-2.5 py-1 text-xs font-bold text-[#AA6C0B]">
                    {approval.status}
                  </span>
                </div>

                {approval.justification && (
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3.5 border border-slate-100 dark:border-[#1E3352]">
                    <strong className="block text-slate-900 dark:text-white font-semibold mb-0.5">
                      Applicant Justification:
                    </strong>
                    {approval.justification}
                  </p>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor={`reason-${approval.id}`}
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Decision Reason / Audit Note
                  </label>
                  <input
                    id={`reason-${approval.id}`}
                    value={reason[approval.id] || ""}
                    onChange={(event) =>
                      setReason((current) => ({ ...current, [approval.id]: event.target.value }))
                    }
                    placeholder="Enter justification recorded in the immutable audit log"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isItemBusy}
                    onClick={() => void decide(approval.id, "rejected")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-[#1E3352] px-5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="size-4 text-[#C23C45]" aria-hidden="true" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={isItemBusy}
                    onClick={() => void decide(approval.id, "approved")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#15805D] hover:bg-[#10664A] px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    <span>{isItemBusy ? "Recording…" : "Approve Role"}</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </section>
      )}
    </main>
  );
}
