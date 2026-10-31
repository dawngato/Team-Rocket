"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
  Clock,
  KeyRound,
} from "lucide-react";
import { userAuthStore } from "@/lib/user_auth_store";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Compute password strength heuristics
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasMinLength, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: "", color: "bg-slate-200" };
    if (strengthScore <= 1) return { label: "Weak", color: "bg-red-500", text: "text-red-500" };
    if (strengthScore === 2) return { label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
    if (strengthScore === 3) return { label: "Good", color: "bg-sky-500", text: "text-sky-500" };
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
  };

  const strength = getStrengthLabel();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify and re-enter.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please acknowledge the institutional election conduct terms before continuing.");
      return;
    }

    setLoading(true);
    try {
      userAuthStore.registerUser(fullName.trim(), email.trim(), password);
      setSubmitted(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Registration request could not be processed at this time."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#FAF8F5] dark:bg-[#07111e]">
      {/* Left Institutional Showcase Column */}
      <section
        aria-label="Institutional Registration Information"
        className="hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-10 xl:p-16 relative overflow-hidden bg-gradient-to-br from-[#0c1a2e] via-[#0f2742] to-[#08121f] text-white border-r border-slate-200/10 dark:border-slate-800/80"
      >
        {/* Ambient Decorative Lighting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-[#157E92]/25 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-[#15805D]/20 rounded-full blur-3xl"
        />

        {/* Cryptographic Grid Pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
        />

        {/* Top Header: Institutional Identity */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#157E92] to-[#0E6273] flex items-center justify-center text-white shadow-lg shadow-[#157E92]/30 ring-1 ring-white/20">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-[#38BDF8]">
              Himachal Pradesh Technical University
            </span>
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              Institutional Member Registration
            </h2>
          </div>
        </div>

        {/* Center Presentation: Registration Governance Workflow */}
        <div className="relative z-10 my-auto py-10 space-y-8 max-w-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Super Administrator Governed Access</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Institutional membership with verified cryptographic integrity.
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed font-normal">
              To ensure full electoral integrity and compliance with institutional bylaws, user accounts
              are registered with standard credentials and operational roles are provisioned exclusively by
              the Super Administrator.
            </p>
          </div>

          {/* 3-Step Verification Pipeline */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#157E92]/30 text-[#38BDF8] flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Institutional Identity Submission
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Provide your legal name and institutional email address. No operational roles are selected at registration.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Super Administrator Authorization
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Super Administrator validates your university enrollment or appointment and assigns your specific role (Administrator, Officer, Teacher, or Student).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Cryptographic Workspace Activation
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upon role assignment, sign in to receive your cryptographic credentials and access your designated operational portal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom System Status Bar */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-[#38BDF8]" aria-hidden="true" />
            <span className="font-medium text-slate-300">
              Role Authority: Centralized Super Administrator
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            HPTU Bylaw Standard Section 4.2
          </span>
        </div>
      </section>

      {/* Right Registration Panel (Stretched & Fluid) */}
      <section
        aria-label="Account Registration Form"
        className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-12 xl:px-16 py-12 lg:py-16 bg-white dark:bg-[#0B1524] transition-colors"
      >
        <div className="w-full max-w-xl mx-auto">
          {submitted ? (
            /* Registration Success View */
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold tracking-wider uppercase">
                  <span>Registration Recorded</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
                  Account Successfully Submitted
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your institutional registration request has been securely registered in the university election database.
                </p>
              </div>

              {/* Record Summary Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-slate-50 dark:bg-[#08121f] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3352] pb-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Full Legal Name
                  </span>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {fullName}
                  </strong>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3352] pb-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Institutional Email
                  </span>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {email}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Operational Status
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Pending Role Assignment
                  </span>
                </div>
              </div>

              {/* Policy Explanation */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
                <Clock className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <strong className="font-semibold block">Institutional Governance Policy</strong>
                  <p>
                    In accordance with institutional guidelines, operational privileges (Administrator,
                    Election Officer, Faculty Member, or Student Voter) are assigned exclusively by
                    the Super Administrator. You will receive authorization once your account is reviewed.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/login"
                  className="flex-1 min-h-[48px] px-6 py-2.5 font-semibold text-white bg-[#157E92] hover:bg-[#0E6273] active:bg-[#0b4e5c] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157E92]"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/"
                  className="px-6 min-h-[48px] py-2.5 font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E3352] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center justify-center text-sm"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            /* Normal Registration Form */
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#157E92]/10 dark:bg-[#157E92]/20 text-[#157E92] dark:text-[#38BDF8] text-xs font-bold tracking-wider uppercase">
                  <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Institutional Member Enrollment</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
                  Create an Account
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Register with your institutional credentials to join the university election platform.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-start gap-3 shadow-sm transition-all"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <div className="space-y-1">
                    <strong className="block font-semibold">Registration Issue</strong>
                    <p className="leading-snug">{error}</p>
                  </div>
                </div>
              )}

              {/* Normal Registration Form: Strictly No Roles */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                  >
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      autoComplete="name"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white pl-11 pr-4 py-2.5 text-sm focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      placeholder="e.g. Rahul Sharma or Dr. Priya Verma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                  >
                    Institutional Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white pl-11 pr-4 py-2.5 text-sm focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      placeholder="name@university.edu or rollnumber@hptu.ac.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                    >
                      Password
                    </label>
                    {password && (
                      <span className={`text-xs font-bold ${strength.text}`}>
                        {strength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white pl-11 pr-12 py-2.5 text-sm focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      placeholder="Enter a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Strength Progress Bar */}
                  {password.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 1 ? strength.color : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 2 ? strength.color : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 3 ? strength.color : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 4 ? strength.color : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span className={`inline-flex items-center gap-1 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                          {hasMinLength ? <Check className="w-3 h-3" /> : "•"} At least 8 characters
                        </span>
                        <span className={`inline-flex items-center gap-1 ${hasUpperCase ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                          {hasUpperCase ? <Check className="w-3 h-3" /> : "•"} Uppercase letter
                        </span>
                        <span className={`inline-flex items-center gap-1 ${hasNumber || hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                          {hasNumber || hasSpecial ? <Check className="w-3 h-3" /> : "•"} Number or symbol
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <input
                      id="reg-confirm-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white pl-11 pr-4 py-2.5 text-sm focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Institutional Terms & Governance Agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-[#157E92] focus:ring-[#157E92] dark:bg-[#08121f] cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      I confirm that this is my official institutional university identity and understand that
                      operational roles are authorized exclusively by the Super Administrator.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[50px] bg-[#157E92] hover:bg-[#0E6273] active:bg-[#0b4e5c] text-white font-semibold rounded-xl text-sm transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157E92]"
                >
                  {loading ? (
                    <>
                      <span
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <span>Registering account…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Registration</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              {/* Navigation to Login */}
              <div className="pt-6 border-t border-slate-200 dark:border-[#1E3352] text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Already registered?{" "}
                  <Link
                    href="/auth/login"
                    className="text-[#157E92] dark:text-[#38BDF8] font-bold hover:underline"
                  >
                    Sign in here
                  </Link>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  By registering, you agree to adhere to university election integrity policies and ethical conduct standards.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
