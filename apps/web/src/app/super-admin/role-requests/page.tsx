"use client";

import React, { useState } from "react";
import { UserCheck2, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { INITIAL_ROLE_REQUESTS } from "@/lib/mock_data";
import { RoleRequestRecord } from "@/lib/types";

export default function SuperAdminRoleRequestsPage() {
  const [requests, setRequests] = useState<RoleRequestRecord[]>(INITIAL_ROLE_REQUESTS);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = (id: string, action: "APPROVED" | "REJECTED") => {
    setRequests(
      requests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: action,
              dual_control_approver: action === "APPROVED" ? "superadmin@hptu.ac.in" : undefined,
            }
          : r
      )
    );
    setFeedback(`Request ${id} marked as ${action}. Dual control audit event committed.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <UserCheck2 className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Dual Control Authorization
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Elevated Role Requests
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Review delegation requests for Election Officers and Roster Approvers with required multi party consent.
          </p>
        </div>
      </div>

      <SuperAdminNav />

      {feedback && (
        <div className="p-4 rounded-xl bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#10233F] dark:text-white text-base">
                  {req.requester_name}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({req.requester_email})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    req.status === "APPROVED"
                      ? "bg-[#15805D]/10 text-[#15805D]"
                      : req.status === "REJECTED"
                      ? "bg-[#C23C45]/10 text-[#C23C45]"
                      : "bg-[#AA6C0B]/10 text-[#AA6C0B]"
                  }`}
                >
                  {req.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Requested Role:</strong>{" "}
                <span className="text-[#157E92] font-semibold">{req.requested_role}</span> |{" "}
                <strong>Scope:</strong> {req.scope}
              </p>
              <p className="text-xs text-slate-500 italic">
                &quot;{req.justification}&quot;
              </p>
              {req.dual_control_approver && (
                <p className="text-[11px] font-mono text-[#15805D] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Dual control approved by: {req.dual_control_approver}</span>
                </p>
              )}
            </div>

            {req.status === "PENDING_APPROVAL" && (
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction(req.id, "REJECTED")}
                  className="min-h-[44px] px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1E3352] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
                >
                  <XCircle className="w-4 h-4 text-[#C23C45]" aria-hidden="true" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(req.id, "APPROVED")}
                  className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#15805D] hover:bg-[#0E6273] rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15805D]"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Approve Scope</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
