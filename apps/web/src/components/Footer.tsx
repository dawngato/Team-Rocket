"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Lock,
  FileCheck2,
  CheckCircle,
  ExternalLink,
  Cpu,
  Eye,
  Scale,
  Search,
  Vote,
  Key,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-50/70 dark:border-slate-800/80 dark:bg-[#030812]/95 backdrop-blur-md text-sm transition-colors">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand & Architectural Principles (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#07111E] border border-cyan-500/40 p-0.5 group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(21,126,146,0.3)] transition-all">
                <Image
                  src="/himvote-logo.svg"
                  alt="HimVote Institutional Logo"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-[#10233F] dark:text-white">
                HimVote
              </span>
            </Link>

            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg">
              Institutional campus election system engineered for mathematical verifiability,
              cryptographic receipt generation, and strict cryptographic separation between voter identity
              and cast ballots under RFC 9474 and RFC 9162 specifications.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Zero Tracking Cookies
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-medium">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                Isolated Credential Vault
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-medium">
                <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
                Tamper-Evident Merkle Ledger
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400 font-medium">
                <Key className="w-3.5 h-3.5" aria-hidden="true" />
                RFC 9474 Blind Signatures
              </span>
            </div>
          </div>

          {/* Column 2: Public Auditing & Verifiability */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Audit &amp; Verifiability
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/audit"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Public Audit Explorer
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Verification Architecture
                </Link>
              </li>
              <li>
                <Link
                  href="/results"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Published Election Results
                </Link>
              </li>
              <li>
                <Link
                  href="/security-limits"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Security Limits &amp; Boundaries
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Institutional Operations */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Campus Operations
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/elections"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Active Campus Elections
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Authorized Portal Authentication
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Voter Verification Protocol
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/recover"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Credential Access Recovery
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Standards & Compliance */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Governance &amp; Standards
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/accessibility"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Accessibility (WCAG 2.1 AA)
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Terms of Service &amp; Governance
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Privacy Policy &amp; Data Ethics
                </Link>
              </li>
              <li>
                <Link
                  href="/security-limits"
                  className="text-slate-600 hover:text-[#157E92] dark:text-slate-400 dark:hover:text-cyan-300 transition-colors"
                >
                  Cryptographic Hardness Bounds
                </Link>
              </li>
              <li className="text-slate-500 dark:text-slate-500 text-xs pt-1">
                Language: English (Institutional Standard)
              </li>
            </ul>
          </div>
        </div>

        {/* Institutional Disclaimers Box */}
        <div className="mt-12 pt-8 border-t border-slate-200/90 dark:border-slate-800/90 space-y-4">
          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 block mb-1">
            Prototype and Deployment Notice:
            </strong>
            This prototype contains code paths for blinded credential issuance, ballot encryption, witness checkpoints, and Merkle proof handling. This footer does not establish which services, keys, or protocols are configured. Verify the deployed implementation and evidence before relying on privacy, audit, or blockchain claims.
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <span>HimVote Prototype • Service and protocol configuration varies</span>
            </div>
            <div className="text-center md:text-right">
              Blockchain anchoring and finality are not verified by this interface.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
