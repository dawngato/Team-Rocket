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
  Cpu, 
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
        "The cryptographic protocol cannot prevent a student or staff member from being coerced, watched, or intimidated in unsupervised physical locations (such as a hostel room or student union office). Digital receipts intentionally contain zero information about chosen candidates to prevent vote-selling, but outside physical influence cannot be eliminated purely through software.",
      assumption:
        "Voters access the platform in a private, unmonitored physical setting without third-party physical surveillance.",
      mitigation:
        "Zero Candidate Exposure: The receipt handle contains strictly a deterministic nullifier and Merkle tree inclusion hash : never candidate IDs. Even if forced to show their receipt handle, no one can prove which candidate was chosen.",
    },
    {
      id: "device-malware",
      title: "Compromised Personal Device & Endpoint Malware",
      category: "PHYSICAL",
      severity: "CLIENT-SIDE LIMIT",
      badgeColor: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
      description:
        "If a voter's smartphone or personal laptop has active keyloggers, screen recording spyware, or rogue browser extensions installed, malicious code can intercept screen taps or keystrokes before browser-level client-side encryption occurs.",
      assumption:
        "The voter's runtime environment (web browser and operating system) executes without malware intercepting memory buffers during ballot sealing.",
      mitigation:
        "Strict Content Security Policy (CSP), subresource integrity, memory-clearing after encryption, and recommendation to use updated personal browsers or campus-certified kiosk workstations.",
    },
    {
      id: "crypto-hardness",
      title: "Foundational Cryptographic Hardness (SHA-256 & RSA)",
      category: "CRYPTOGRAPHIC",
      severity: "HARDNESS ASSUMPTION",
      badgeColor: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
      description:
        "System security guarantees strictly rely on classical cryptographic hardness. If classical SHA-256 collision resistance fails or future cryptanalytic breakthroughs break 2048/4096-bit RSA discrete logarithm/factoring before post-quantum transitions, mathematical guarantees would degrade.",
      assumption:
        "Standard cryptographic hardness assumptions hold: SHA-256 requires ~2^128 operations for collision, and RFC 9474 RSA blind signatures remain computationally unforgeable.",
      mitigation:
        "HimVote strictly avoids proprietary crypto and adheres directly to RFC 9474 (Blind Signatures) and RFC 9162 (Merkle Transparency). Algorithm agility allows seamless migration to post-quantum signature schemes.",
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
        "Voter cohorts exceed minimal demographic anonymity thresholds (minimum 20 voters per reported election segment).",
      mitigation:
        "Automated Privacy Guard: HimVote automatically flags electorates with fewer than 20 voters as 'PRIVACY_LIMITED' and strictly suppresses granular department breakdowns to prevent deductive de-anonymization.",
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
      mitigation:
        "Current prototype boundary: the identity database and casting ledger use separate service boundaries, but independent witness custody and externally pinned checkpoints are not established in the local profile. A release must supply those trust anchors before claiming administrator-independent tamper detection.",
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
      mitigation:
        "Blind issuance includes randomized timing jitter, separate DNS endpoints, and advice to cast through varied networks or delayed submission queues.",
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
      mitigation:
        "Strict issuance cutoff window, multi-factor OTP verification, automated registration conflict alerts, and the interactive Physical ID Card verifier that checks photo geometry and roll credentials.",
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
        "At least one configured independent witness node achieves 99.5% uptime during election audit windows.",
      mitigation:
        "Fail-Closed Publication: HimVote will automatically transition into 'UNVERIFIABLE' state rather than publishing unchecked results, preventing unverified or disputed election outcomes from being declared valid.",
    },
    {
      id: "blockchain-reorg",
      title: "Consortium Blockchain Deep Reorganization",
      category: "CRYPTOGRAPHIC",
      severity: "FINALITY ASSUMPTION",
      badgeColor: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
      description:
        "HimVote anchors Merkle tree root commitments to an EVM smart contract for permanent timestamped anchoring. If an underlying network experiences a 51% attack or chain reorganization deeper than 64 blocks, state anchors could experience temporary forks.",
      assumption:
        "The anchoring EVM blockchain maintains standard BFT/PoS finality without consensus collapse or deep history rollbacks.",
      mitigation:
        "Finality Threshold Requirements: Audits require 12+ block depth confirmations before final tally certification.",
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
        "Server clocks across identity and casting clusters synchronize via authenticated NTP with drift bounded below 500ms.",
      mitigation:
        "Server-authoritative timestamps: Client system clocks are never trusted for election open/close enforcement; monotonic server time controls issuance freezing.",
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
          Radical Honesty & Cryptographic Transparency
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
          Security Limits, Boundaries & Assumptions
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          HimVote rejects marketing buzzwords like &quot;100% unhackable&quot; or &quot;impenetrable blockchain security&quot;. 
          Every real-world security protocol operates under strictly defined physical, operational, and mathematical boundaries. 
          Here we transparently disclose every boundary, threat model assumption, and engineering mitigation in plain campus terms.
        </p>
      </div>

      {/* Primary Invariant Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#10233F] to-[#0A1627] dark:from-[#0B1524] dark:to-[#07111E] text-white space-y-3 shadow-lg border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#38BDF8] font-bold text-sm">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>The HimVote Verified Standard</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
            Audit v7.0
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          A security claim is presented on this platform <strong>only if verified by independent mathematical checks and test suites</strong>. 
          All cryptographic operations use open, peer-reviewed RFC specifications (RFC 9474 Blind Signatures, RFC 9162 Merkle Transparency Logs, RFC 8785 Canonical JSON). 
          Where technology stops and human trust begins, we explicitly document the boundary.
        </p>
      </div>

      {/* Key Guarantees vs Non-Guarantees Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>What HimVote Mathematically Guarantees</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Ballot Privacy:</strong> No database administrator, teacher, or dean can discover who you voted for from servers or logs.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>One Student, One Vote:</strong> Duplicate votes and double-spending tokens are mathematically rejected by cryptographic nullifiers.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Tamper-Proof Ledger:</strong> Once recorded in the RFC 9162 Merkle log, no past vote can be deleted or replaced without invalidating cryptographic root hashes.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Individual Verifiability:</strong> Every voter gets a personal receipt handle to verify their ballot's presence in the public witness tree.</span>
            </li>
          </ul>
        </div>

        <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>What Software Cannot Prevent Alone</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">⚠</span>
              <span><strong>Physical Intimidation:</strong> If someone stands directly over your shoulder in a hostel room while you tap your screen.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">⚠</span>
              <span><strong>Device Malware:</strong> If a voter's phone has spyware or screen-recording apps installed that capture keystrokes before browser encryption.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">⚠</span>
              <span><strong>Voluntary Credential Sharing:</strong> If a student deliberately hands their college login and OTP to an unauthorized senior or friend.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">⚠</span>
              <span><strong>Demographic Elimination:</strong> In a contest with only 5 voters, software cannot hide unanimous consensus from common sense deductions.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(["ALL", "PHYSICAL", "CRYPTOGRAPHIC", "OPERATIONAL", "NETWORK"] as BoundaryCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-[#10233F] text-white dark:bg-[#38BDF8] dark:text-[#07111E] shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {cat === "ALL" ? "All Boundaries (10)" : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
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
                  <strong className="text-amber-800 dark:text-amber-300 block mb-0.5">Assumed Environmental Condition:</strong>
                  {item.assumption}
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-xs text-slate-600 dark:text-slate-400">
                  <strong className="text-cyan-800 dark:text-cyan-300 block mb-0.5">Engineered System Mitigation:</strong>
                  {item.mitigation}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assumptions Breakdown Matrix Table */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/70 dark:bg-[#0E1A2B] space-y-4">
        <div className="flex items-center gap-2 text-[#10233F] dark:text-white font-bold text-sm">
          <Scale className="w-4 h-4 text-[#157E92]" />
          <span>Operational Assumptions Matrix (At a Glance)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1E3352] text-slate-700 dark:text-slate-300">
                <th className="py-2 px-3 font-semibold">Subsystem</th>
                <th className="py-2 px-3 font-semibold">Standard Implemented</th>
                <th className="py-2 px-3 font-semibold">Underlying Assumption</th>
                <th className="py-2 px-3 font-semibold">Graceful Degradation Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">Blind Signatures</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">RFC 9474 RSA-FDH</td>
                <td className="py-2.5 px-3">Unlinkability of blinded tokens & factoring hardness</td>
                <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Fails closed if signature verify fails</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">Audit Ledger</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">RFC 9162 Merkle Log</td>
                <td className="py-2.5 px-3">SHA-256 collision resistance</td>
                <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Witness rejects conflicting tree heads</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">Record Canonicalization</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">RFC 8785 Canonical JSON</td>
                <td className="py-2.5 px-3">Determinism of UTF-16 code unit ordering</td>
                <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Rejects malformed non-canonical bodies</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">Witness Governance</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">Multi-party Co-signing</td>
                <td className="py-2.5 px-3">Witness nodes operate on isolated external cloud/infra</td>
                <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400">UNVERIFIABLE state, blocks certification</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">Chain Finality</td>
                <td className="py-2.5 px-3 font-mono text-[11px]">EVM Anchor Contract</td>
                <td className="py-2.5 px-3">Consortium chain block finality within 12 confirmations</td>
                <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Offline Merkle proof fallback verification</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Public Auditor Links */}
      <div className="pt-6 border-t border-slate-200 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Source references: <code>docs/security_assumptions.md</code> &amp; <code>docs/threat_model.md v7.0</code>
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
