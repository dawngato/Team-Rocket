"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";

export default function StudentVerifyAccountPage() {
  const [token, setToken] = useState("");
  const [error] = useState(
    "Email verification is not available in this development profile. No account is marked active from a browser-only code entry."
  );

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#15805D] text-white flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#10233F] dark:text-white">
          Verify Account Enrollment
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Enter the six digit verification code issued to your university email address.
        </p>
      </div>

      <div className="rounded-xl border border-[#AA6C0B]/30 bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div className="rounded-lg border border-[#AA6C0B]/30 bg-[#AA6C0B]/10 p-3 text-sm text-[#6B4707] dark:text-[#FBBF24]" role="alert">
          <AlertTriangle className="inline-block mr-2 size-4 align-text-bottom" aria-hidden="true" />
          {error}
        </div>
        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="token-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Six Digit Verification Code
            </label>
            <input
              id="token-input"
              type="text"
              required
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. 592814"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15805D]"
            >
              <span>Verification unavailable</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="text-center pt-2 text-xs text-slate-500">
            Need assistance? Contact your department roster officer.
          </div>
        </form>
        <Link href="/auth/login" className="text-[#157E92] dark:text-[#38BDF8] font-bold hover:underline text-sm">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
