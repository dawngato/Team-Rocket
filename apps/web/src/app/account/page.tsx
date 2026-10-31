"use client";

import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { identityClient, type SessionProfile } from "@/lib/identity_client";

function roleLabel(role: string): string {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AccountSettingsPage() {
  const [session, setSession] = useState<SessionProfile | null>(null);

  useEffect(() => {
    void identityClient.getSession().then(setSession).catch(() => setSession(null));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#157E92] dark:text-[#38BDF8]"><UserRound className="size-4" aria-hidden="true" /> Account</div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">Account settings</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Review the server-authorized identity and scopes attached to this session.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Current session">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#1E3352] dark:bg-[#132135]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Institutional account</p>
          <p className="mt-2 break-all text-sm font-semibold text-[#10233F] dark:text-white">{session?.email || "Session profile unavailable"}</p>
          <p className="mt-1 text-xs text-slate-500">Identity service response only</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#1E3352] dark:bg-[#132135]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Granted workspaces</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {session?.roles.map((role) => <span key={role} className="rounded-md border border-[#157E92]/20 bg-[#157E92]/10 px-2 py-1 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">{roleLabel(role)}</span>) || <span className="text-sm text-slate-500">Not available</span>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#15805D] dark:text-[#34D399]" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-[#10233F] dark:text-white">Session and scope protection</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Role labels control navigation visibility, but every sensitive action is authorized again by the server for its institution, election, department, or class scope.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-[#10233F] dark:text-white">Sign out of session</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Terminates this authenticated session and revokes local session tokens.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                if (typeof window !== "undefined") {
                  window.sessionStorage.removeItem("himvote_session_receipts");
                  window.localStorage.removeItem("himvote_receipts");
                }
                await identityClient.logout();
              } finally {
                window.location.href = "/auth/login";
              }
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 transition-colors shrink-0"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </section>
    </main>
  );
}
