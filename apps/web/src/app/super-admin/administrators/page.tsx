"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Key, Mail, UserPlus, Users2, ShieldCheck, Clock } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { apiClient } from "@/lib/api_client";
import type { AdminInvitationRecord } from "@/lib/types";

export default function SuperAdminAdministratorsPage() {
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInvitations(await apiClient.getInvitations());
    } catch (cause) {
      setInvitations([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "Authoritative administrator invitation records could not be retrieved."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const invitation = await apiClient.createInvitation({
        email: newEmail,
        role: "administrator",
        scope: "institution",
      });
      setFeedback(
        `Campus Administrator invitation ${invitation.invitation_id} committed to identity ledger. Delivery is handled by the configured adapter.`
      );
      setNewEmail("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The institutional identity service rejected the administrator invitation."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <p className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#1E3A5F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1E3A5F] dark:bg-white/10 dark:text-white">
          <Users2 className="size-3.5 text-[#2459A6]" aria-hidden="true" />
          Administrative Accounts
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1E3A5F] dark:text-white">
          Institutional Campus Administrators
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Campus Administrator invitations and credential scopes are read directly from the authoritative identity issuer. Hardware TOTP MFA is mandatory.
        </p>
      </header>

      <SuperAdminNav />

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Administrator Invitations
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#1E3A5F] dark:text-white">
            {loading ? "…" : invitations.filter((i) => i.role === "administrator").length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Campus-level administrative invitations
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Access Control Boundary
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Institution Scope Enforced</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Bound to university governance root
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            MFA Requirement
          </span>
          <div className="mt-2 text-base font-bold text-[#2459A6] dark:text-[#60A5FA] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2459A6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2459A6]" />
            </span>
            <span>TOTP + Hardware Key</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Strict onboarding multi-factor verification
          </span>
        </motion.div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">
          {error}
        </div>
      )}

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-sm font-semibold text-[#0F5B43] dark:text-[#34D399]" role="status">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <h2 className="flex items-center gap-2 font-bold text-[#1E3A5F] dark:text-white text-base">
          <UserPlus className="size-5 text-[#2459A6]" aria-hidden="true" />
          <span>Invite Campus Administrator</span>
        </h2>
        <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Institutional Email Address
            <input
              id="administrator-email"
              required
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="administrator@hptu.ac.in"
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm dark:border-[#1E3352] dark:text-white outline-none focus:border-[#2459A6] focus:ring-2 focus:ring-[#2459A6]/20"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2459A6] hover:bg-[#1E3A5F] px-5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Mail className="size-4" aria-hidden="true" />
            <span>{busy ? "Authorizing Invitation…" : "Issue Administrator Invitation"}</span>
          </button>
        </form>
        <p className="text-xs text-slate-500">
          The identity issuer cryptographically registers the invitation token and associates it with institutional administrative privileges.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-[#1E3352]">
          <h2 className="font-bold text-[#1E3A5F] dark:text-white text-base">
            Authoritative Invitation Ledger
          </h2>
        </div>
        {invitations.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {loading ? "Querying authoritative identity ledger…" : "No invitations returned by the identity service."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/50 border-b border-slate-100 dark:border-[#1E3352]">
                <tr>
                  <th className="px-6 py-3.5">Institutional Email</th>
                  <th className="px-6 py-3.5">Role &amp; Scope</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Expiration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
                {invitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all duration-150"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-[#1E3A5F] dark:text-white">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#2459A6] dark:text-[#60A5FA]">
                      {invitation.role === "administrator" ? "Campus Administrator" : invitation.role} · {invitation.scope}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#AA6C0B]/10 text-[#AA6C0B] border border-[#AA6C0B]/30">
                        <Key className="size-3.5" aria-hidden="true" />
                        <span>{invitation.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {new Date(invitation.expires_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
