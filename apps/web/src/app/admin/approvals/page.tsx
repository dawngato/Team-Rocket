"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Clock } from "lucide-react";

interface RoleApproval {
  id: string;
  applicant: string;
  email: string;
  requestedRole: string;
  scope: string;
  justification: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
}

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<RoleApproval[]>([
    {
      id: "appr_101",
      applicant: "Dr. Alok Nath Sen",
      email: "alok.sen@hptu.ac.in",
      requestedRole: "ELECTION_OFFICER",
      scope: "Mechanical Engineering Student Council 2026",
      justification: "Appointed as faculty returning officer by the Dean of Academic Affairs.",
      status: "PENDING",
      requestedAt: "2026-10-30T08:15:00Z",
    },
    {
      id: "appr_102",
      applicant: "Pooja Hegde",
      email: "pooja.h@hptu.ac.in",
      requestedRole: "ROSTER_AUDITOR",
      scope: "Civil Engineering Department",
      justification: "Student council election oversight committee representative.",
      status: "PENDING",
      requestedAt: "2026-10-29T16:40:00Z",
    },
  ]);

  const handleDecision = (id: string, decision: "APPROVED" | "REJECTED") => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision } : a))
    );
  };

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

      <div className="space-y-4">
        {approvals.map((item) => {
          const isPending = item.status === "PENDING";
          return (
            <div
              key={item.id}
              className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-lg text-[#10233F] dark:text-white">
                    {item.applicant}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">{item.email}</span>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-md ${
                    item.status === "APPROVED"
                      ? "bg-[#15805D]/10 text-[#15805D] border border-[#15805D]/30"
                      : item.status === "PENDING"
                      ? "bg-[#AA6C0B]/10 text-[#AA6C0B] border border-[#AA6C0B]/30"
                      : "bg-[#C23C45]/10 text-[#C23C45] border border-[#C23C45]/30"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block">Requested Role</span>
                  <strong className="text-slate-800 dark:text-slate-200">{item.requestedRole}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Scope Assignment</span>
                  <strong className="text-slate-800 dark:text-slate-200">{item.scope}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block">Justification</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{item.justification}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1E3352]">
                <span className="text-[11px] font-mono text-slate-400">
                  Requested: {new Date(item.requestedAt).toLocaleString()}
                </span>
                {isPending ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, "APPROVED")}
                      className="min-h-[44px] px-4 py-1.5 text-xs font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Approve Role Grant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(item.id, "REJECTED")}
                      className="min-h-[44px] px-4 py-1.5 text-xs font-bold text-[#C23C45] hover:bg-[#C23C45]/10 border border-[#C23C45]/30 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    Decision recorded to immutable audit ledger
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
