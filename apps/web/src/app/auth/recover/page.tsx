"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { identityClient } from "@/lib/identity_client";

export default function AccountRecoveryPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) setResetToken(token);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await identityClient.requestRecovery(email);
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recovery could not be requested.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (resetPassword !== resetConfirmation) {
      setError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      await identityClient.resetPassword(resetToken, resetPassword);
      setResetSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The recovery link could not be accepted.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#157E92] text-white flex items-center justify-center mx-auto shadow-md">
          <KeyRound className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#10233F] dark:text-white">
          Account Recovery
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Request an out-of-band recovery token or institutional reset for your student or staff credential.
        </p>
      </div>

      {resetToken ? (
        resetSuccess ? (
          <div className="rounded-xl border border-[#15805D]/30 bg-white p-6 text-center shadow-sm dark:bg-[#132135]" role="status">
            <CheckCircle2 className="mx-auto size-10 text-[#15805D]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold text-[#10233F] dark:text-white">Password reset complete</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Previous sessions were revoked. You can now sign in with the new password.</p>
            <Link href="/auth/login" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
            <div><label htmlFor="reset-token" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Recovery token</label><input id="reset-token" required minLength={32} value={resetToken} onChange={(event) => setResetToken(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 font-mono text-sm dark:border-[#1E3352]" /></div>
            <div><label htmlFor="reset-password" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">New password</label><input id="reset-password" required minLength={16} type="password" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-[#1E3352]" /></div>
            <div><label htmlFor="reset-confirmation" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm new password</label><input id="reset-confirmation" required minLength={16} type="password" autoComplete="new-password" value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-[#1E3352]" /></div>
            {error && <p className="rounded-lg border border-[#C23C45]/30 bg-[#C23C45]/10 p-3 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</p>}
            <button type="submit" disabled={resetLoading} className="min-h-11 w-full rounded-lg bg-[#157E92] px-4 text-sm font-bold text-white disabled:opacity-50">{resetLoading ? "Saving password…" : "Reset password"}</button>
          </form>
        )
      ) : submitted ? (
        <div className="rounded-xl border border-[#15805D]/30 bg-white dark:bg-[#132135] p-6 shadow-sm text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#15805D] mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
            Recovery request accepted
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            If an active institutional profile is bound to <strong>{email}</strong>, the configured notification service will deliver a single-use reset link. This page never claims delivery when the service has not accepted the message.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/login"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
        >
          <div>
            <label htmlFor="recovery-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Registered Institutional Email
            </label>
            <input
              id="recovery-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Per Section 0.1 hard rules, password reset will invalidate previous session tokens and require MFA reverification.
            </span>
          </div>

          {error && <div className="rounded-lg border border-[#C23C45]/30 bg-[#C23C45]/10 p-3 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>{loading ? "Dispatching..." : "Send Recovery Instructions"}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="text-center pt-2 text-xs text-slate-500">
            Remembered your credentials?{" "}
            <Link href="/auth/login" className="text-[#157E92] dark:text-[#38BDF8] font-bold hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
