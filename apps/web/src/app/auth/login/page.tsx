"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { identityClient } from "@/lib/identity_client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await identityClient.login(email, password, mfaToken || undefined);
      if (data.mfa_required) {
        setError("MFA is required before an authenticated session can be created.");
      } else {
        router.push("/student/elections");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The identity service rejected the sign in request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F6FA] dark:bg-[#0B1524] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#132135] rounded-xl shadow-xl border border-slate-200 dark:border-[#1E3352] p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-lg bg-[#157E92] flex items-center justify-center text-white">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          <h1 className="text-xl font-bold text-[#17233B] dark:text-white">Sign in to HimVote</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Institutional email</label>
            <input
              type="email"
              required
              className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-[#1E3352] bg-[#F3F6FA] dark:bg-[#0B1524] text-[#17233B] dark:text-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-[#1E3352] bg-[#F3F6FA] dark:bg-[#0B1524] text-[#17233B] dark:text-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MFA token (if required)</label>
            <input
              type="text"
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
