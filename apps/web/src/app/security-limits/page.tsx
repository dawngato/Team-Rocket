"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  EyeOff, 
  Server, 
  Key, 
  WifiOff, 
  Clock, 
  Search, 
  SlidersHorizontal,
  Info,
  Scale
} from "lucide-react";

type BoundaryCategory = "ALL" | "PHYSICAL" | "CRYPTOGRAPHIC" | "OPERATIONAL" | "NETWORK";

export default function SecurityLimitsPage() {
  const [activeCategory, setActiveCategory] = useState<BoundaryCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const securityLimits = [
    {
      id: "coercion",
      title: "Outside Voter Coercion & Physical Pressure",
      category: "PHYSICAL",
      severity: "PHYSICAL BOUNDARY",
      badgeColor: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      description:
        "Software cannot prevent a voter from being coerced, watched, or intimidated in an unsupervised physical location. Whether receipt data reveals information about a selection depends on the deployed protocol and records; this page does not verify that property.",
      assumption:
        "Voters access the platform in a private, unmonitored physical setting without third-party physical surveillance.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "device-malware",
      title: "Compromised Personal Device & Endpoint Malware",
      category: "PHYSICAL",
      severity: "CLIENT-SIDE LIMIT",
      badgeColor: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
      description:
        "If a device has keyloggers, screen recording spyware, or malicious browser extensions, they may intercept a selection before any client-side protection runs. The active encryption and endpoint protections depend on the deployed client.",
      assumption:
        "The voter's runtime environment (web browser and operating system) executes without malware intercepting memory buffers during ballot sealing.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "crypto-hardness",
      title: "Foundational Cryptographic Hardness (SHA-256 & RSA)",
      category: "CRYPTOGRAPHIC",
      severity: "HARDNESS ASSUMPTION",
      badgeColor: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
      description:
        "When a protocol relies on SHA-256 or RSA, its security depends on the relevant cryptographic assumptions and correct implementation. This page does not establish which algorithms or key sizes are active in a deployment.",
      assumption:
        "Standard cryptographic hardness assumptions hold: SHA-256 requires ~2^128 operations for collision, and RFC 9474 RSA blind signatures remain computationally unforgeable.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "small-electorate",
      title: "Small Electorate & Demographic Elimination",
      category: "OPERATIONAL",
      severity: "STATISTICAL LIMIT",
      badgeColor: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      description:
        "In university departments or club elections where voter turnout is tiny (e.g. fewer than 20 students), an adversary who knows that 19 students voted for Candidate A can deduce the 20th student's ballot by pure demographic elimination, regardless of cryptographic strength.",
      assumption:
        "Published totals or outside knowledge may make a small group of voters identifiable. No minimum anonymity threshold is established by this page.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "multi-authority-collusion",
      title: "Institutional Authority Collusion",
      category: "OPERATIONAL",
      severity: "GOVERNANCE BOUNDARY",
      badgeColor: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10",
      description:
        "If university administrators, internal IT database managers, and appointed external auditors all deliberately conspire to falsify records, internal checks alone would be insufficient without external transparency checkpoints.",
      assumption:
        "The external Witness node (e.g., student union or external auditor) operates on independent infrastructure and will not sign conflicting checkpoints.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "traffic-timing",
      title: "Network Traffic Timing & Side-Channel Analysis",
      category: "NETWORK",
      severity: "NETWORK RESISTANCE",
      badgeColor: "border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",
      description:
        "A passive network adversary monitoring campus ISP packet arrival times could theoretically attempt to correlate the millisecond an identity token was issued with the millisecond an anonymous ballot packet hit the casting gateway.",
      assumption:
        "Sufficient concurrent campus network traffic or anonymizing jitter to prevent microsecond packet-pairing attacks.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "identity-theft",
      title: "Student ID Theft & Social Engineering Phishing",
      category: "OPERATIONAL",
      severity: "IDENTITY BOUNDARY",
      badgeColor: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
      description:
        "If a student willingly shares their campus credentials, password, and OTP, or falls victim to targeted phishing before the credential freeze window, an attacker could claim the voter's blind token before the student does.",
      assumption:
        "Students safeguard their university credentials and physical institutional ID cards against unauthorized handover.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "witness-outage",
      title: "Permanent Witness Node Outage & Censorship",
      category: "NETWORK",
      severity: "LIVENESS LIMIT",
      badgeColor: "border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10",
      description:
        "If external witness nodes experience a prolonged cloud network outage or deliberate network partition during tally publication, the platform cannot produce co-signed transparency proofs.",
      assumption:
        "Witness availability and independence must be established for each deployment; this page does not measure uptime.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "blockchain-reorg",
      title: "Consortium Blockchain Deep Reorganization",
      category: "CRYPTOGRAPHIC",
      severity: "FINALITY ASSUMPTION",
      badgeColor: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
      description:
        "If a deployment anchors checkpoints to an EVM chain, network attacks or reorganizations can affect the observed transaction history. This interface does not establish that a chain or contract is configured.",
      assumption:
        "Any configured blockchain may reorganize or fail to reach the expected finality. The chain and finality policy are not verified here.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    },
    {
      id: "clock-drift",
      title: "Bounded Clock Drift & NTP Desynchronization",
      category: "NETWORK",
      severity: "TIMING ASSUMPTION",
      badgeColor: "border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",
      description:
        "Election cutoff windows (such as Sunday 5:00 PM) require consistent time recognition across distributed voter clients and identity gateways.",
      assumption:
        "A deployment must define how identity and casting services handle clock synchronization and election cutoffs. This page does not measure clock drift.",
      mitigation: "This page does not verify that a related control is enabled. Confirm implementation and evidence for the deployed system.",
    }
  ];

  const filteredLimits = securityLimits.filter((item) => {
    const matchesCategory = activeCategory === "ALL" || item.category === activeCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mitigation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] dark:text-[#FBBF24]">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          Deployment Review Notes
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          Security Limits, Boundaries & Assumptions
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          This page outlines security questions for system owners and reviewers. It does not certify this software, its cryptography, or any connected deployment.
        </p>
      </div>

      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3" aria-labelledby="scope-heading">
        <h2 id="scope-heading" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Info className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Prototype threat model, not a security certification
        </h2>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The topics below describe risks to assess. This page does not run cryptographic verification or prove that any mitigation is enabled in a deployment. The local configuration does not establish production witness keys, an election commitment map, a blockchain RPC endpoint, a deployed contract, or relayer authority. Do not treat this page as evidence that a real election is secure.
        </p>
        <div className="grid gap-4 border-t border-amber-500/20 pt-4 text-xs sm:grid-cols-2">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Threat areas described</h3>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">Endpoint compromise, coercion, small electorates, service outages, operator collusion, traffic analysis, and chain reorganization.</p>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Evidence still required</h3>
            <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">Review the deployed protocols and source, pinned keys, election configuration, independent witness custody, chain and contract settings, operational policies, and test evidence.</p>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(["ALL", "PHYSICAL", "CRYPTOGRAPHIC", "OPERATIONAL", "NETWORK"] as BoundaryCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              type="button"
              aria-pressed={activeCategory === cat}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? "bg-[#10233F] text-white dark:bg-[#38BDF8] dark:text-[#07111E] shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {cat === "ALL" ? `All Boundaries (${securityLimits.length})` : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
            type="text"
              aria-label="Search security limits"
            placeholder="Search boundaries & limits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>
      </div>

      {/* Security Limits Cards */}
      <div className="space-y-4">
        {filteredLimits.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-500 text-xs">
            No security boundaries match your search filter.
          </div>
        ) : (
          filteredLimits.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-base text-[#10233F] dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#AA6C0B] flex-shrink-0" aria-hidden="true" />
                  <span>{item.title}</span>
                </h3>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono border self-start sm:self-auto ${item.badgeColor}`}>
                  {item.severity}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-slate-600 dark:text-slate-400">
            <strong className="text-amber-800 dark:text-amber-300 block mb-0.5">Threat assumption:</strong>
                  {item.assumption}
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-xs text-slate-600 dark:text-slate-400">
            <strong className="text-cyan-800 dark:text-cyan-300 block mb-0.5">Implementation status:</strong>
                  {item.mitigation}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 space-y-4 dark:border-[#1E3352] dark:bg-[#0E1A2B]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#10233F] dark:text-white">
          <Scale className="size-4 text-[#157E92]" aria-hidden="true" />
          <h2>Deployment evidence to confirm</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-slate-700 dark:border-[#1E3352] dark:text-slate-300"><th className="px-3 py-2">Area</th><th className="px-3 py-2">Required evidence</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 dark:divide-slate-800 dark:text-slate-400">
              <tr><td className="px-3 py-2.5 font-semibold">Election and eligibility</td><td className="px-3 py-2.5">Published manifest, eligibility policy, and the roster source used by the deployment.</td></tr>
              <tr><td className="px-3 py-2.5 font-semibold">Credential issuer</td><td className="px-3 py-2.5">Issuer public key, supported protocol configuration, and independently reviewed issuance records.</td></tr>
              <tr><td className="px-3 py-2.5 font-semibold">Witnesses</td><td className="px-3 py-2.5">Pinned witness keys, quorum policy, and evidence that witness operators are independently controlled.</td></tr>
              <tr><td className="px-3 py-2.5 font-semibold">Blockchain anchor</td><td className="px-3 py-2.5">Chain ID, RPC endpoint, deployed contract address, relayer key and permissions, and finality policy.</td></tr>
              <tr><td className="px-3 py-2.5 font-semibold">Privacy and cryptography</td><td className="px-3 py-2.5">Protocol review, data-flow analysis, key custody, and independent verification of any published proof.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">No deployment-specific evidence is loaded or verified by this page.</p>
      </section>

      {/* Public Auditor Links */}
      <div className="pt-6 border-t border-slate-200 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          No deployment-specific security evidence is attached to this page.
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/audit"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline"
          >
            Audit Explorer
          </Link>
          <Link
            href="/how-it-works"
            className="text-xs font-bold text-[#157E92] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
          >
            <span>Review How Verification Works</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
