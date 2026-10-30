"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Key, Mail, UserPlus, Users2 } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { apiClient } from "@/lib/api_client";
import type { AdminInvitationRecord } from "@/lib/types";

export default function SuperAdminAdministratorsPage() {
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInvitations(await apiClient.getInvitations());
    } catch (cause) {
      setInvitations([]);
      setError(cause instanceof Error ? cause.message : "Administrator invitation records are unavailable.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    try {
      const invitation = await apiClient.createInvitation({ email: newEmail, role: "administrator", scope: "institution" });
      setFeedback(`Invitation ${invitation.invitation_id} was committed. Delivery status is controlled by the identity service.`);
      setNewEmail("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The identity service rejected the invitation.");
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <p className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#10233F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#10233F] dark:bg-white/10 dark:text-white"><Users2 className="size-3.5 text-[#157E92]" aria-hidden="true" />Administrative accounts</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">Institutional administrators</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Invitations and status are read from the identity service. No local administrator records are created.</p>
      </header>
      <SuperAdminNav />
      {error && <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630]" role="alert">{error}</div>}
      {feedback && <div className="flex items-center gap-2 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-sm font-semibold text-[#0F5B43]" role="status"><CheckCircle2 className="size-5" aria-hidden="true" />{feedback}</div>}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <h2 className="flex items-center gap-2 font-bold text-[#10233F] dark:text-white"><UserPlus className="size-5 text-[#157E92]" aria-hidden="true" />Invite administrator</h2>
        <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Institutional email<input id="administrator-email" required type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm" /></label>
          <button type="submit" className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white"><Mail className="size-4" aria-hidden="true" />Issue identity invitation</button>
        </form>
        <p className="text-xs text-slate-500">The identity service may reject delivery in production until an independently configured notification adapter is available.</p>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-[#1E3352]"><h2 className="font-bold text-[#10233F] dark:text-white">Authoritative invitation log</h2></div>
        {invitations.length === 0 ? <p className="p-6 text-sm text-slate-500">No invitations returned by the identity service.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/50"><tr><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role and scope</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Expires</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">{invitations.map((invitation) => <tr key={invitation.id}><td className="px-6 py-4 font-mono text-xs">{invitation.email}</td><td className="px-6 py-4">{invitation.role} · {invitation.scope}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-1 text-xs font-semibold text-[#AA6C0B]"><Key className="size-3.5" aria-hidden="true" />{invitation.status}</span></td><td className="px-6 py-4 text-xs text-slate-500">{new Date(invitation.expires_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}
