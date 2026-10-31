"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { identityClient } from "@/lib/identity_client";

const ROLE_OPTIONS: Record<string, { label: string; description: string; path: string }> = {
  super_admin: { label: "Super Administrator", description: "Campus governance, audit events & system configuration", path: "/super-admin" },
  administrator: { label: "Campus Administrator", description: "Teacher directory, invitations & approval queues", path: "/admin" },
  election_officer: { label: "Election Officer", description: "Election builder, candidate rosters & lifecycle controls", path: "/officer" },
  teacher: { label: "Teacher / Faculty", description: "Class rosters & student verification queue", path: "/teacher" },
  auditor: { label: "Independent Auditor", description: "Trust pins, evidence bundles & cryptographic proof verification", path: "/auditor" },
  student: { label: "Student Voter", description: "Contests, credentials, voting booth & receipt tracker", path: "/student" },
};

function normalizeRoleKey(role: string): string {
  const norm = role.trim().toLowerCase();
  if (norm === "superadmin") return "super_admin";
  if (norm === "admin") return "administrator";
  if (norm === "officer") return "election_officer";
  return norm;
}

function workspaceForRole(role: string): string {
  const key = normalizeRoleKey(role);
  return ROLE_OPTIONS[key]?.path || "/student";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [grantedRoles, setGrantedRoles] = useState<string[] | null>(null);
  const [rememberPreference, setRememberPreference] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await identityClient.login(email, password, mfaToken || undefined);
      if (data.mfa_required) {
        setError("MFA is required before an authenticated session can be created.");
      } else {
        const profile = await identityClient.getSession();
        const availableRoles = profile.roles && profile.roles.length > 0 ? profile.roles : [data.role];

        // P1-29: For multi-role accounts, check preferred primary workspace or prompt choice
        if (availableRoles.length > 1) {
          const preferred = typeof window !== "undefined" ? window.localStorage.getItem("himvote_primary_role") : null;
          if (preferred && availableRoles.map(normalizeRoleKey).includes(normalizeRoleKey(preferred))) {
            router.push(workspaceForRole(preferred));
            return;
          }
          setGrantedRoles(availableRoles);
        } else {
          router.push(workspaceForRole(availableRoles[0]));
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The identity service rejected the sign in request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = (role: string) => {
    if (rememberPreference && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("himvote_primary_role", normalizeRoleKey(role));
      } catch {}
    }
    router.push(workspaceForRole(role));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F6FA] dark:bg-[#0B1524] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#132135] rounded-xl shadow-xl border border-slate-200 dark:border-[#1E3352] p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-lg bg-[#157E92] flex items-center justify-center text-white">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          <h1 className="text-xl font-bold text-[#17233B] dark:text-white">
            {grantedRoles ? "Choose Authorized Workspace" : "Sign in to HimVote"}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {grantedRoles ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your verified account holds multiple delegated roles. Select which authorized workspace to enter for this session:
            </p>
            <div className="space-y-2.5">
              {grantedRoles.map((role) => {
                const key = normalizeRoleKey(role);
                const meta = ROLE_OPTIONS[key] || { label: role, description: "Authorized workspace", path: workspaceForRole(role) };
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSelectWorkspace(role)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] hover:border-[#157E92] dark:hover:border-[#157E92] hover:bg-slate-50 dark:hover:bg-[#0E1A2B] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
                  >
                    <div className="font-semibold text-[#17233B] dark:text-white flex items-center justify-between">
                      <span>{meta.label}</span>
                      <span className="text-xs text-[#157E92] font-mono">Enter →</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="pt-2 flex items-center gap-2">
              <input
                id="remember-pref"
                type="checkbox"
                checked={rememberPreference}
                onChange={(e) => setRememberPreference(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#157E92] focus:ring-[#157E92]"
              />
              <label htmlFor="remember-pref" className="text-xs text-slate-600 dark:text-slate-400">
                Remember my choice as default workspace
              </label>
            </div>
          </div>
        ) : (

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Institutional email</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-[#1E3352] bg-[#F3F6FA] dark:bg-[#0B1524] text-[#17233B] dark:text-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-[#1E3352] bg-[#F3F6FA] dark:bg-[#0B1524] text-[#17233B] dark:text-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="login-mfa-token" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MFA token (if required)</label>
            <input
              id="login-mfa-token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-[#1E3352] bg-[#F3F6FA] dark:bg-[#0B1524] text-[#17233B] dark:text-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              placeholder="6-digit code"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-[#157E92] text-white font-semibold rounded-lg hover:bg-[#0E6273] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          First time? <Link href="/auth/register" className="text-[#157E92] hover:underline font-medium">Create account</Link>
        </p>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/auth/recover" className="text-[#157E92] hover:underline font-medium">Account recovery</Link>
        </p>
      </div>
    </div>
  );
}
