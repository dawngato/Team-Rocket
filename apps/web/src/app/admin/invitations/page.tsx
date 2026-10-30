"use client";

import React, { useState } from "react";
import { Mail, Plus, CheckCircle2, Copy } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: "inv_1",
      email: "registrar.officer@hptu.ac.in",
      role: "ELECTION_OFFICER",
      token: "tok_invite_officer_9918234",
      expiresAt: "2026-11-15T00:00:00Z",
    },
    {
      id: "inv_2",
      email: "external.auditor@auditfirm.example.in",
      role: "AUDITOR",
      token: "tok_invite_auditor_7718293",
      expiresAt: "2026-12-01T00:00:00Z",
    },
  ]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ELECTION_OFFICER");
  const [isCopied, setIsCopied] = useState<string | null>(null);

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const newInv: Invitation = {
      id: `inv_${Date.now()}`,
      email,
      role,
      token: `tok_${role.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };
    setInvitations([newInv, ...invitations]);
    setEmail("");
  };

  const copyToken = (tok: string) => {
    navigator.clipboard.writeText(tok);
    setIsCopied(tok);
    setTimeout(() => setIsCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Access Control
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Administrator and Officer Invitations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Dispatch scoped invitation credentials for campus election officers and independent auditors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Create Invitation Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCreateInvite}
            className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
          >
            <h2 className="font-bold text-base text-[#10233F] dark:text-white">
              Dispatch Invitation
            </h2>

            <div>
              <label htmlFor="invite-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@hptu.ac.in"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="invite-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Role Scope
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="ELECTION_OFFICER">Election Officer</option>
                <option value="AUDITOR">Independent Auditor</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              <span>Generate Invitation Token</span>
            </button>
          </form>
        </div>

        {/* Existing Invitations List */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Active Invitation Tokens
          </h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#10233F] dark:text-white">
                      {inv.email}
                    </h3>
                    <span className="text-xs font-semibold text-[#157E92]">{inv.role}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs font-mono">
                  <span className="truncate pr-2 text-slate-600 dark:text-slate-400">
                    {inv.token}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToken(inv.token)}
                    className="p-1 rounded text-[#157E92] hover:bg-[#157E92]/10"
                    aria-label="Copy invitation token"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                {isCopied === inv.token && (
                  <span className="text-[11px] text-[#15805D] font-semibold block text-right">
                    Token copied to clipboard
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
