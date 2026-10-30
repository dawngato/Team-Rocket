"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, CheckCircle2, Lock, ArrowRight, ShieldCheck, EyeOff } from "lucide-react";

export default function SecurityLimitsPage() {
  const securityLimits = [
    {
      title: "Outside Voter Coercion",
      severity: "BOUNDARY",
      description:
        "The system cannot prevent a voter from being coerced or observed outside the voting booth. Receipts are non transferable and do not disclose choices, but family or peer pressure in unsupervised physical settings cannot be eliminated by software.",
      mitigation:
        "Receipt handles contain only commitment hashes, not candidate identifiers, preventing cryptographic proof of vote selling.",
    },
    {
      title: "Compromised Personal Devices",
      severity: "LIMITATION",
      description:
        "If a voter personal computer or mobile phone is infected with keyloggers, screen scrapers, or spyware, malware can intercept selections before client side encryption or steal session tokens.",
      mitigation:
        "Voters are advised to vote from secure personal devices, keep operating systems updated, and verify receipt status independently.",
    },
    {
      title: "Network Timing and Metadata Correlation",
      severity: "LIMITATION",
      description:
        "In electorates with very small turnout or distinct timing patterns, network eavesdroppers observing packet arrivals could theoretically correlate issuance requests with casting events.",
      mitigation:
        "Small electorate results below 20 voters are marked PRIVACY_LIMITED and tallies are suppressed. Blind credentials include randomized delay jitter.",
    },
    {
      title: "Collusion Across All Institutional Authorities",
      severity: "BOUNDARY",
      description:
        "If the Central Registrar, the independent Witness organization, and the appointed External Auditor all actively collude to falsify records, cryptographic integrity guarantees are degraded.",
      mitigation:
        "Witness nodes operate under separate organizational governance, and auditor attestations require pinned keys distributed out of band.",
    },
    {
      title: "Credential Theft and Identity Phishing",
      severity: "LIMITATION",
      description:
        "An adversary who steals a student university credentials before the blind credential cutoff can obtain the voter blind token if multi factor authentication is not enforced.",
      mitigation:
        "Mandatory TOTP MFA for administrative tiers, student email confirmation pins, and strict issuance freeze windows.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24]">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Honest Security Disclosures
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          Security Limits and Assumptions
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          HimVote states exactly what its independent verifier confirmed. We reject unqualified marketing claims like &quot;unhackable&quot; or &quot;100 percent secure&quot;. Every cryptographic protocol has explicit physical and operational boundaries.
        </p>
      </div>

      {/* Primary Invariant Banner */}
      <div className="p-6 rounded-2xl bg-[#10233F] dark:bg-[#0B1524] text-white space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-[#38BDF8] font-bold text-sm">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>The HimVote Verifier Standard</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          A security property is presented as confirmed only when proven by the available verifier and trusted evidence. This system has full test coverage for RFC 9474 blind signature vectors, Merkle logs, RFC 8785 canonicalization, and checkpoint workflows. Its external voting engine and production chain finality remain limited.
        </p>
      </div>

      {/* Security Limits Cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
          Documented Threat Model Boundaries
        </h2>
        <div className="space-y-4">
          {securityLimits.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#10233F] dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#AA6C0B]" aria-hidden="true" />
                  <span>{item.title}</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.severity}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.description}
              </p>
              <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-[#1E3352] text-xs text-slate-600 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">System Mitigation: </strong>
                {item.mitigation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Public Auditor Links */}
      <div className="pt-6 border-t border-slate-200 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Source references: threat_model.md v7.0 and privacy_limitations.md v7.0
        </span>
        <Link
          href="/how-it-works"
          className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
        >
          <span>Review How Verification Works</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
