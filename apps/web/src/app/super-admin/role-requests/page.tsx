"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { adminApprovalsClient, type RoleApproval } from "@/lib/admin_approvals";

export default function SuperAdminRoleRequestsPage() {
  const [requests, setRequests] = useState<RoleApproval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const load = () => void adminApprovalsClient.getPendingApprovals().then(setRequests).catch((cause) => setError(cause instanceof Error ? cause.message : "Role request queue unavailable."));
  useEffect(load, []);
  const decide = async (id: string, decision: "approved" | "rejected") => {
    try { await adminApprovalsClient.decideApproval(id, decision, reasons[id] || "Reviewed through the authenticated dual control queue."); setFeedback(`Decision ${decision} was committed by the identity service.`); load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Role decision was rejected."); }
  };
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#157E92]"><ShieldCheck className="size-4" aria-hidden="true" />Dual control authorization</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Elevated role requests</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">The list and decisions are loaded from the identity issuer. A successful message appears only after its response is committed.</p></header><SuperAdminNav />{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}{feedback && <div className="flex items-center gap-2 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-sm font-semibold text-[#0F5B43]" role="status"><CheckCircle2 className="size-5" aria-hidden="true" />{feedback}</div>}{requests.length === 0 ? <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500">No pending role requests.</div> : <section className="space-y-4">{requests.map((request) => <article key={request.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div><h2 className="font-bold text-[#10233F] dark:text-white">{request.email || request.applicant}</h2><p className="text-xs text-slate-500">{request.requestedRole} · {request.scope}</p></div><p className="text-sm text-slate-600 dark:text-slate-300">{request.justification}</p><input value={reasons[request.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Decision reason" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><div className="flex gap-3"><button type="button" onClick={() => void decide(request.id, "rejected")} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold"><XCircle className="size-4 text-[#C23C45]" aria-hidden="true" />Reject</button><button type="button" onClick={() => void decide(request.id, "approved")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#15805D] px-4 text-sm font-bold text-white"><CheckCircle2 className="size-4" aria-hidden="true" />Approve</button></div></article>)}</section>}</main>;
}
