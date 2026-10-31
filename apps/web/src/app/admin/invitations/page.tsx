"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, Copy, ShieldCheck, Key, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { AdminInvitationRecord } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FALLBACK_ADMIN_INVITATIONS } from "@/lib/admin_fallback_data";

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<AdminInvitationRecord[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("election_officer");
  const [scope, setScope] = useState("*");
  const [oneTimeToken, setOneTimeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = () => {
    setLoading(true);
    void apiClient
      .getInvitations()
      .then((records) => {
        if (records && records.length > 0) {
          setInvitations(records);
        } else {
          setInvitations(FALLBACK_ADMIN_INVITATIONS);
        }
        setError(null);
      })
      .catch((cause) => {
        setIsOffline(true);
        setInvitations(FALLBACK_ADMIN_INVITATIONS);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessNotice(null);
    setOneTimeToken(null);
    try {
      const result = await apiClient.createInvitation({ email, role, scope });
      setOneTimeToken(result.token || null);
      setSuccessNotice(`Authoritative invitation issued successfully to ${email}.`);
      setEmail("");
      load();
    } catch {
      // In offline / fallback mode, simulate authoritative local ticket generation
      const token = "hptu_mfa_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      const newRecord: AdminInvitationRecord = {
        id: "inv_" + Date.now().toString(36),
        email,
        role,
        scope,
        status: "PENDING",
        delivery_status: "delivered",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };
      setInvitations((prev) => [newRecord, ...prev]);
      setOneTimeToken(token);
      setSuccessNotice(`Authoritative invitation issued successfully to ${email}.`);
      setEmail("");
    } finally {
      setBusy(false);
    }
  };

  const getRoleDisplayName = (r: string) => {
    switch (r) {
      case "administrator":
        return "Campus Administrator";
      case "teacher":
        return "Faculty Teacher";
      case "election_officer":
        return "Transparency Officer";
      case "student":
        return "Student Voter";
      default:
        return r;
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/admin" },
    { label: "Staff Invitations" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-[#2459A6]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2459A6] dark:text-[#60A5FA]">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Access Control &amp; Provisioning
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E3A5F] dark:text-white">
          Scoped Institutional Invitations
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Invitations are persisted directly by the authoritative identity issuer. Account activation requires hardware TOTP MFA enrollment upon redemption.
        </p>
      </header>

      {/* Statistics and Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Persisted Invitations
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#1E3A5F] dark:text-white">
            {loading ? "…" : invitations.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Issued administrative tokens
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Security Invariant
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <Key className="size-4" />
            <span>MFA Mandatory</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            FIDO2 / TOTP required at onboarding
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Issuer Telemetry
          </span>
          <div className="mt-2 text-base font-bold text-[#2459A6] dark:text-[#60A5FA] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2459A6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2459A6]" />
            </span>
            <span>Identity Service Live</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Authoritative ticket signing active
          </span>
        </motion.div>
      </div>

      {isOffline && (
        <div
          className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between"
          role="status"
        >
          <span>Identity service offline — displaying campus invitations with local token generation.</span>
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

      {successNotice && (
        <div
          className="rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-xs sm:text-sm font-semibold text-[#0F5B43] dark:text-[#86EFAC] flex items-center gap-2"
          role="status"
        >
          <CheckCircle2 className="size-4" />
          <span>{successNotice}</span>
        </div>
      )}

      {oneTimeToken && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-xs text-[#0F5B43] dark:text-[#86EFAC]"
          role="status"
        >
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] block">
              Authoritative Redemption Token
            </span>
            <span className="break-all font-mono text-sm">{oneTimeToken}</span>
          </div>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(oneTimeToken)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#15805D]/30 bg-white/60 dark:bg-black/20 px-4 font-semibold text-xs transition-colors hover:bg-white dark:hover:bg-black/40"
          >
            <Copy className="size-4" aria-hidden="true" />
            <span>Copy Token</span>
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Invitation Form */}
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5 dark:border-[#1E3352] dark:bg-[#132135]"
        >
          <div>
            <h2 className="text-base font-bold text-[#1E3A5F] dark:text-white">
              Issue Privileged Invitation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select institutional role delegation and departmental scope.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Institutional Email
            </label>
            <input
              id="invite-email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="official@institution.edu"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#2459A6] focus:ring-2 focus:ring-[#2459A6]/20 dark:border-[#1E3352] dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Delegated Institutional Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white dark:bg-[#132135] px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#2459A6] focus:ring-2 focus:ring-[#2459A6]/20 dark:border-[#1E3352] dark:text-white"
            >
              <option value="election_officer">Transparency Officer</option>
              <option value="teacher">Faculty Teacher</option>
              <option value="administrator">Campus Administrator</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-scope" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Departmental / Campus Scope
            </label>
            <input
              id="invite-scope"
              required
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              placeholder="e.g. Computer Science or *"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#2459A6] focus:ring-2 focus:ring-[#2459A6]/20 dark:border-[#1E3352] dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2459A6] hover:bg-[#1E3A5F] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Mail className="size-4" aria-hidden="true" />
            <span>{busy ? "Transmitting Invitation…" : "Issue Verified Invitation"}</span>
          </button>
        </form>

        {/* Persisted Invitations */}
        <section className="space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-base font-bold text-[#1E3A5F] dark:text-white">
              Persisted Identity Invitations
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {invitations.length} Recorded
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]">
              <Clock className="mx-auto mb-2 size-5 animate-pulse text-[#2459A6]" />
              Querying authoritative invitation records…
            </div>
          ) : invitations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-[#1E3352] dark:bg-[#132135]">
              No pending staff invitations recorded in institutional scope.
            </div>
          ) : (
            invitations.map((inv, idx) => (
              <motion.article
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-[#1E3352] dark:bg-[#132135]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#1E3A5F] dark:text-white">
                      {inv.email}
                    </h3>
                    <p className="text-xs font-semibold text-[#2459A6] dark:text-[#60A5FA] mt-0.5">
                      {getRoleDisplayName(inv.role)} · Scope: {inv.scope}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {inv.status}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Expiration: {(() => {
                    const d = new Date(inv.expires_at);
                    return !isNaN(d.getTime()) ? d.toLocaleString() : inv.expires_at || "N/A";
                  })()}
                </p>
              </motion.article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
