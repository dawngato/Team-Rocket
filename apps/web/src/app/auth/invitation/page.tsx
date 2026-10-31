"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { identityClient } from "@/lib/identity_client";

export default function InvitationAcceptancePage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const suppliedToken = searchParams.get("token");
    if (suppliedToken) setToken(suppliedToken);
  }, [searchParams]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await identityClient.redeemInvitation(token.trim(), password);
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The invitation could not be accepted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#157E92] text-white"><KeyRound className="size-6" aria-hidden="true" /></span>
        <h1 className="mt-4 text-2xl font-bold text-[#10233F] dark:text-white">Accept staff invitation</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Set a private password and complete mandatory MFA enrollment for the scoped workspace in this invitation.</p>
      </div>

      {status === "success" ? (
        <section className="rounded-2xl border border-[#15805D]/30 bg-white p-6 text-center shadow-sm dark:bg-[#132135]" role="status">
          <ShieldCheck className="mx-auto size-10 text-[#15805D] dark:text-[#34D399]" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-[#10233F] dark:text-white">Invitation accepted</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your role is active only within the scope granted by the invitation. Sign in with your new password and MFA.</p>
          <Link href="/auth/login" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#157E92] px-4 text-sm font-bold text-white">Continue to sign in</Link>
        </section>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
          <div><label htmlFor="invitation-token" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Invitation token</label><input id="invitation-token" required minLength={16} value={token} onChange={(event) => setToken(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 font-mono text-sm dark:border-[#1E3352]" /></div>
          <div><label htmlFor="invitation-password" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Create password</label><input id="invitation-password" required minLength={16} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-[#1E3352]" /></div>
          <div><label htmlFor="invitation-confirmation" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm password</label><input id="invitation-confirmation" required minLength={16} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-[#1E3352]" /></div>
          {error && <p className="rounded-lg border border-[#C23C45]/30 bg-[#C23C45]/10 p-3 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="min-h-11 w-full rounded-xl bg-[#157E92] px-4 text-sm font-bold text-white disabled:opacity-50">{loading ? "Accepting invitation…" : "Accept invitation"}</button>
        </form>
      )}
    </main>
  );
}
