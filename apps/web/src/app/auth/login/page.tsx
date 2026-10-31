"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogIn,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  FileCheck2,
  ArrowRight,
  Fingerprint,
} from "lucide-react";
import { identityClient } from "@/lib/identity_client";
import { normalizeRole, workspaceHome } from "@/lib/routes/nav_config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore remembered email on client mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("himvote_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage access failures
    }

    const authError = new URLSearchParams(window.location.search).get("error");
    if (authError === "session_expired") {
      setError("Your identity session could not be validated. Sign in again to establish a fresh session.");
    } else if (authError === "service_unavailable") {
      setError("The identity service is temporarily unavailable. Please try again shortly.");
    } else if (authError === "access_denied") {
      setError("Your account does not have a role authorized for the requested workspace.");
    } else if (authError === "auth_failed") {
      setError("The identity service could not complete sign in. Please try again shortly.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPendingNotice(null);

    try {
      // 1. Authenticate credentials through the identity client
      const loginResponse = await identityClient.login(email, password, mfaRequired ? mfaToken : undefined);

      // Handle remember me preference
      try {
        if (rememberMe) {
          localStorage.setItem("himvote_remembered_email", email);
        } else {
          localStorage.removeItem("himvote_remembered_email");
        }
      } catch {
        // Ignore localStorage access failures
      }

      if (loginResponse.mfa_required) {
        setMfaRequired(true);
        setMfaToken("");
        setError(null);
        return;
      }

      // Route only after the identity issuer confirms the active session and roles.
      const session = await identityClient.getSession();
      const assignedRoles = session.roles.filter((role) => normalizeRole(role));
      if (assignedRoles.length === 0) {
        setPendingNotice(
          "Your institutional account is authenticated, but it has no active workspace role. Please contact your institutional administrator for role assignment."
        );
        await identityClient.logout();
        return;
      }

      setMfaRequired(false);
      setMfaToken("");
      const nextTarget = new URLSearchParams(window.location.search).get("next");
      if (nextTarget) {
        try {
          const destination = new URL(nextTarget, window.location.origin);
          if (destination.origin === window.location.origin && destination.pathname !== "/auth/login") {
            router.replace(`${destination.pathname}${destination.search}${destination.hash}`);
            return;
          }
        } catch {
          // Ignore malformed redirect targets and use the role's workspace.
        }
      }
      router.replace(workspaceHome(assignedRoles));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Invalid institutional email or password. Please verify your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#FAF8F5] dark:bg-[#07111e]">
      {/* Left Institutional Showcase Column (Stretched & Fluid) */}
      <section
        aria-label="Institutional Overview"
        className="hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-10 xl:p-16 relative overflow-hidden bg-gradient-to-br from-[#0c1a2e] via-[#0f2742] to-[#08121f] text-white border-r border-slate-200/10 dark:border-slate-800/80"
      >
        {/* Subtle Decorative Ambient Background Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-[#157E92]/25 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-[#15805D]/20 rounded-full blur-3xl"
        />

        {/* Subtle Cryptographic Grid Pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"
        />

        {/* Top Header: Institutional Identity */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#157E92] to-[#0E6273] flex items-center justify-center text-white shadow-lg shadow-[#157E92]/30 ring-1 ring-white/20">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-[#38BDF8]">
              Himachal Pradesh Technical University
            </span>
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              HimVote Institutional Election System
            </h2>
          </div>
        </div>

        {/* Center Presentation: Headline & Cryptographic Pillars */}
        <div className="relative z-10 my-auto py-10 space-y-8 max-w-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-[#38BDF8] text-xs font-semibold tracking-wide">
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Campus Election Prototype</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              A campus election workflow built for careful review.
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed font-normal">
              HimVote demonstrates election workflows, credential handling, and evidence views. Privacy and verification depend on configured services, trusted keys, and independently reviewed evidence.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.07]">
              <div className="flex items-center gap-2.5 mb-1.5 text-[#38BDF8]">
                <Fingerprint className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Credential Privacy Design
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Blinded credentials are supported in the codebase. This interface does not establish unlinkability in a deployment.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.07]">
              <div className="flex items-center gap-2.5 mb-1.5 text-emerald-400">
                <FileCheck2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Audit Evidence
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Merkle inclusion data can be checked when complete proof fields and a trusted root are available.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.07]">
              <div className="flex items-center gap-2.5 mb-1.5 text-amber-400">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Super Admin Governance
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Privileged institutional roles are provisioned exclusively by authorized governance.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.07]">
              <div className="flex items-center gap-2.5 mb-1.5 text-sky-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Transparent Tallies
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Publicly inspectable tallies signed with cryptographic witness keys.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom System Status Bar */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-slate-300">
              Service availability is checked during sign-in
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>Protocol configuration varies by deployment</span>
          </div>
        </div>
      </section>

      {/* Right Authentication Panel (Stretched & Fluid) */}
      <section
        aria-label="User Authentication Form"
        className="w-full lg:w-1/2 xl:w-5/12 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-12 xl:px-16 py-12 lg:py-16 bg-white dark:bg-[#0B1524] transition-colors"
      >
        <div className="w-full max-w-xl mx-auto space-y-8">
          {/* Form Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#157E92]/10 dark:bg-[#157E92]/20 text-[#157E92] dark:text-[#38BDF8] text-xs font-bold tracking-wider uppercase">
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Institutional Sign In</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
              Access Your Account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter your verified university email and password to access your authorized institutional workspace.
            </p>
          </div>

          {/* Authentication Error Alert */}
          {error && (
            <div
              className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-start gap-3 shadow-sm transition-all"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden="true" />
              <div className="space-y-1">
                <strong className="block font-semibold">Authentication Failed</strong>
                <p className="leading-snug">{error}</p>
              </div>
            </div>
          )}

          {/* Pending Role Assignment Notice */}
          {pendingNotice && (
            <div
              className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3.5 shadow-sm transition-all"
              role="status"
            >
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div className="space-y-1.5">
                <strong className="block font-semibold text-amber-900 dark:text-amber-100">
                  Institutional Role Assignment Pending
                </strong>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  {pendingNotice}
                </p>
              </div>
            </div>
          )}

          {/* Normal Login Form: Strictly No Role Selection */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
              >
                Institutional Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white pl-11 pr-4 py-2.5 text-sm focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="e.g. rollnumber@hptu.ac.in or username@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mfaRequired && (
              <div className="space-y-2">
                <label
                  htmlFor="login-mfa-token"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                >
                  Authenticator code
                </label>
                <input
                  id="login-mfa-token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  aria-describedby="login-mfa-help"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white px-4 py-2.5 text-base font-mono tracking-[0.35em] focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="000000"
                  value={mfaToken}
                  onChange={(event) => setMfaToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <p id="login-mfa-help" className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Enter the current six-digit code from your authenticator app to complete sign in.
                </p>
                <button
                  type="button"
                  onClick={() => { setMfaRequired(false); setMfaToken(""); setError(null); }}
                  className="text-xs font-semibold text-[#157E92] hover:underline dark:text-[#38BDF8]"
                >
                  Use a different account
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                >
                  Password
                </label>
                <Link
                  href="/auth/recover"
                  className="text-xs text-[#157E92] hover:text-[#0E6273] dark:text-[#38BDF8] dark:hover:text-[#60a5fa] hover:underline font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" aria-hidden="true" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-[#1E3352] bg-[#F8FAFC] dark:bg-[#08121f] text-slate-900 dark:text-white pl-11 pr-12 py-2.5 text-sm focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="Enter your account password"
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
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#157E92] focus:ring-[#157E92] dark:bg-[#08121f] cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Remember this device for subsequent sign ins
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] bg-[#157E92] hover:bg-[#0E6273] active:bg-[#0b4e5c] text-white font-semibold rounded-xl text-sm transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#157E92]"
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>Authenticating credentials…</span>
                </>
              ) : (
                <>
                  <span>{mfaRequired ? "Verify and Continue" : "Sign In to Workspace"}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Navigation to Registration */}
          <div className="pt-6 border-t border-slate-200 dark:border-[#1E3352] text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              New institutional member?{" "}
              <Link
                href="/auth/register"
                className="text-[#157E92] dark:text-[#38BDF8] font-bold hover:underline"
              >
                Create an account
              </Link>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Protected by university cryptographic authentication protocols. All authorization events are recorded for audit compliance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
