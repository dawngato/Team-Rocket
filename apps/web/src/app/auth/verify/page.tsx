"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function StudentVerifyAccountPage() {
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerified(true);
  };

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

      {verified ? (
        <div className="rounded-xl border border-[#15805D]/30 bg-white dark:bg-[#132135] p-6 shadow-sm text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#15805D] mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
            Account Confirmed
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your university identity token has been validated. You can now authenticate and request cryptographic election credentials.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/login"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <span>Continue to Secure Login</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleVerify}
          className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
        >
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
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15805D]"
            >
              <span>Verify Enrollment</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="text-center pt-2 text-xs text-slate-500">
            Need assistance? Contact your department roster officer.
          </div>
        </form>
      )}
    </div>
  );
}
