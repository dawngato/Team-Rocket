"use client";

import Link from "next/link";
import { ArrowRight, Fingerprint, ShieldCheck } from "lucide-react";

export default function StudentEligibilityPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#157E92] dark:text-[#38BDF8]">
          <Fingerprint className="size-4" aria-hidden="true" />
          Eligibility
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">My eligibility</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Eligibility is decided by the institutional roster and the identity service. This page does not infer eligibility from a student ID image, browser storage, or a local status badge.
        </p>
      </header>

      <section className="rounded-2xl border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-6" role="status">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#AA6C0B] dark:text-[#FCD34D]" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-[#6B4707] dark:text-[#FCD34D]">Authoritative status is required</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6B4707] dark:text-[#FCD34D]">
              An eligible status will appear here only after the roster authority verifies your enrollment and the election service returns a matching scope. No eligibility decision has been fabricated by this client.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/student/elections" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#157E92] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0E6273] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157E92]">
          View my elections <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/student/help" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#1E3352] dark:text-slate-200 dark:hover:bg-slate-800">
          Read eligibility help
        </Link>
      </div>
    </main>
  );
}
