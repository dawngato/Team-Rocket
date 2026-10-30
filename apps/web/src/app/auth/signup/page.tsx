"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Vote, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { identityClient } from "@/lib/identity_client";

export default function StudentSignupPage() {
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await identityClient.registerStudent({ student_id: studentId, full_name: fullName, email });
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration could not be submitted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#157E92] text-white flex items-center justify-center mx-auto shadow-md">
          <Vote className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#10233F] dark:text-white">
          Create Student Account
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Register with your institutional credentials to participate in university elections.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-[#15805D]/30 bg-white dark:bg-[#132135] p-6 shadow-sm text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#15805D] mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#10233F] dark:text-white">
            Registration Submitted
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            A verification link and one time passcode have been dispatched to <strong>{email}</strong>. Department verification officers will match your enrollment record against the university registrar database.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/verify"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <span>Proceed to Account Verification</span>
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
            <label htmlFor="student-id" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institutional Student ID Number
            </label>
            <input
              id="student-id"
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. HPTU 2024 CS 042"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Legal Name
            </label>
            <input
              id="full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As listed on campus identification"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="student-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Official Campus Email Address
            </label>
            <input
              id="student-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@hptu.ac.in"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          {error && <div className="rounded-lg border border-[#C23C45]/30 bg-[#C23C45]/10 p-3 text-sm text-[#8B2630] dark:text-[#FCA5A5]" role="alert">{error}</div>}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <span>{loading ? "Submitting registration request…" : "Submit Registration Request"}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="text-center pt-2 text-xs text-slate-500">
            Already registered?{" "}
            <Link href="/auth/login" className="text-[#157E92] dark:text-[#38BDF8] font-bold hover:underline">
              Sign In Here
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
