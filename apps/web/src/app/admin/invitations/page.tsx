"use client";

import React, { useEffect, useState } from "react";
import { Mail, Copy } from "lucide-react";
import { apiClient } from "../../../lib/api_client";
import type { AdminInvitationRecord } from "../../../lib/types";

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("election_officer");
  const [scope, setScope] = useState("*");
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => void apiClient.getInvitations().then(setInvitations).catch((cause) => setError(cause instanceof Error ? cause.message : "Invitation records could not be loaded."));
  useEffect(load, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setOneTimeToken(null);
    try { const result = await apiClient.createInvitation({ email, role, scope }); setOneTimeToken(result.token || null); setEmail(""); load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invitation was rejected by the identity service."); }
    finally { setBusy(false); }
  };

  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]"><p className="text-xs font-semibold uppercase tracking-wide text-[#157E92]">Access control</p><h1 className="mt-1 text-3xl font-bold text-[#10233F] dark:text-white">Scoped invitations</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Invitations are persisted by the identity issuer. Tokens are shown only when the configured delivery adapter explicitly returns a one-time development token.</p></header>{error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}{oneTimeToken && <div className="flex items-center justify-between gap-3 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-xs text-[#0F5B43]" role="status"><span className="break-all font-mono">{oneTimeToken}</span><button type="button" onClick={() => void navigator.clipboard.writeText(oneTimeToken)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#15805D]/30 px-3 font-semibold"><Copy className="size-4" aria-hidden="true" />Copy once</button></div>}<div className="grid gap-8 lg:grid-cols-12"><form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5 dark:border-[#1E3352] dark:bg-[#132135]"><h2 className="font-bold text-[#10233F] dark:text-white">Create invitation</h2><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="recipient@institution.edu" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><select value={role} onChange={(event) => setRole(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:bg-[#132135]"><option value="election_officer">Election officer</option><option value="teacher">Teacher</option><option value="administrator">Administrator</option></select><input required value={scope} onChange={(event) => setScope(event.target.value)} placeholder="department or *" className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /><button disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white disabled:opacity-50"><Mail className="size-4" aria-hidden="true" />{busy ? "Submitting…" : "Create invitation"}</button></form><section className="space-y-3 lg:col-span-7"><h2 className="font-bold text-[#10233F] dark:text-white">Persisted invitations</h2>{invitations.map((inv) => <article key={inv.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-[#10233F] dark:text-white">{inv.email}</h3><p className="text-xs text-[#157E92]">{inv.role} · {inv.scope}</p></div><span className="text-xs font-semibold text-slate-500">{inv.status}</span></div><p className="mt-2 text-[11px] text-slate-500">Expires {new Date(inv.expires_at).toLocaleString()}</p></article>)}</section></div></main>;
}
