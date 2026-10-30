"use client";

import React, { useState } from "react";
import { Users2, UserPlus, CheckCircle2, ShieldCheck, Mail, Key } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { INITIAL_ADMINISTRATORS } from "@/lib/mock_data";

export default function SuperAdminAdministratorsPage() {
  const [admins, setAdmins] = useState(INITIAL_ADMINISTRATORS);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName) return;

    const newAdmin = {
      id: `adm_local_${Date.now()}`,
      email: newEmail,
      full_name: newFullName,
      role: "ADMINISTRATOR" as const,
      scope: ["Regional Campus", "STUDENT_ROSTER"],
      mfa_enabled: false,
      invited_by: "superadmin@hptu.ac.in",
      created_at_utc: new Date().toISOString(),
      last_login_utc: "PENDING_ENROLLMENT",
    };

    setAdmins([newAdmin, ...admins]);
    setFeedback(`Invitation issued to ${newEmail} with required TOTP MFA registration.`);
    setNewEmail("");
    setNewFullName("");
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Users2 className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Administrative Accounts
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Institutional Administrators
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Provision local administrators with designated scopes and mandatory multi factor authentication.
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

      {/* Invite Form */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#10233F] dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#157E92]" aria-hidden="true" />
          <span>Invite New Campus Administrator</span>
        </h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="adm-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              id="adm-name"
              type="text"
              required
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="e.g. Dr. Kavita Sharma"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>
          <div>
            <label htmlFor="adm-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institutional Email (@hptu.ac.in)
            </label>
            <input
              id="adm-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="kavita.s@hptu.ac.in"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </div>

      {/* Administrators Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352]">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Active Administrative Staff
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Administrator</th>
                <th scope="col" className="px-6 py-3">Role Tier</th>
                <th scope="col" className="px-6 py-3">Assigned Scopes</th>
                <th scope="col" className="px-6 py-3">MFA Status</th>
                <th scope="col" className="px-6 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {admins.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#10233F] dark:text-white">{adm.full_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{adm.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        adm.role === "SUPER_ADMINISTRATOR"
                          ? "bg-[#10233F] text-white dark:bg-[#157E92]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {adm.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {adm.scope.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {adm.mfa_enabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15805D]">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Enrolled (TOTP)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#AA6C0B]">
                        <Key className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pending Setup</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {adm.last_login_utc === "PENDING_ENROLLMENT"
                      ? "Pending"
                      : new Date(adm.last_login_utc).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
