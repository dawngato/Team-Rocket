"use client";

import React, { useEffect, useState } from "react";
import { Plus, UserCheck } from "lucide-react";
import { apiClient } from "../../../lib/api_client";
import type { TeacherRecord } from "../../../lib/types";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => void apiClient.getTeachers().then(setTeachers).catch((cause) => setError(cause instanceof Error ? cause.message : "Teacher directory unavailable."));
  useEffect(load, []);
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try { const result = await apiClient.createInvitation({ email, role: "teacher", scope }); setMessage(`Teacher invitation ${result.invitation_id} was persisted. The account is activated only after secure redemption.`); setEmail(""); load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Teacher invitation was rejected."); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#157E92]">Faculty governance</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Teachers and verification officers</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Directory entries come from identity role assignments. No local activation switch is exposed.</p></div><button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white"><Plus className="size-4" aria-hidden="true" />Invite teacher</button></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}{message && <div className="rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-sm text-[#0F5B43]" role="status">{message}</div>}{showForm && <form onSubmit={invite} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3 dark:border-[#1E3352] dark:bg-[#132135]"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teacher@institution.edu" className="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><input required value={scope} onChange={(event) => setScope(event.target.value)} placeholder="department scope" className="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><button disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#15805D] px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? "Submitting…" : "Persist teacher invitation"}</button></form>}<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex items-center gap-2 border-b border-slate-200 p-5 font-bold text-[#10233F] dark:border-[#1E3352] dark:text-white"><UserCheck className="size-5 text-[#157E92]" aria-hidden="true" />Authoritative teacher directory</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/40"><tr><th className="px-5 py-4">Email</th><th className="px-5 py-4">Scope</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Role assignment</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">{teachers.map((teacher) => <tr key={teacher.id}><td className="px-5 py-4 font-semibold">{teacher.email || teacher.full_name}</td><td className="px-5 py-4">{teacher.scope || teacher.department}</td><td className="px-5 py-4">{teacher.status || (teacher.active ? "ACTIVE" : "INACTIVE")}</td><td className="px-5 py-4">{teacher.role}</td></tr>)}</tbody></table></div></section></main>;
}
