"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  FileCheck,
  Globe,
  Layers,
  Download,
  ExternalLink,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { StateBadge } from "@/components/StateBadge";
import { INITIAL_ELECTIONS, INITIAL_EVIDENCE, INITIAL_RESULTS } from "@/lib/mock_data";
import { EvidencePackage, Election } from "@/lib/types";

export default function PublicAuditExplorerPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredElections = INITIAL_ELECTIONS.filter((el) => {
    const ev = INITIAL_EVIDENCE[el.id];
    const term = searchTerm.toLowerCase();
    return (
      el.title.toLowerCase().includes(term) ||
      el.id.toLowerCase().includes(term) ||
      el.manifest_digest.toLowerCase().includes(term) ||
      (ev && ev.anchor_tx_hash.toLowerCase().includes(term)) ||
      (ev && ev.final_checkpoint_digest.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Universal Verifiability
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Public Audit Explorer
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Independently audit manifest digests, witness Merkle checkpoints, and blockchain anchor transactions.
          </p>
        </div>
        <Link
          href="/auditor/evidence"
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          <span>Offline Evidence Verifier</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by election title, manifest digest, Merkle root, or chain transaction hash..."
          className="w-full min-h-[48px] pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
        />
      </div>

      {/* Evidence Packages List */}
      <div className="space-y-6">
        {filteredElections.map((elec) => {
          const evidence: EvidencePackage = INITIAL_EVIDENCE[elec.id] || {
            election_id: elec.id,
            manifest_digest: elec.manifest_digest,
            final_checkpoint_digest: "deb3384abb0306e861b04a6e760e9fa992f25a5632507a91454a49538880a7e5",
            anchor_tx_hash: "0x4f82a93c7210e395b018c47f89a2b6d19e04c8f2a573b9e1a82649d038271e9a",
            auditor_signature: "sig_ed25519_certified_offline_package",
          };

          return (
            <div
              key={elec.id}
              className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3352]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#10233F] dark:text-white">
                      {elec.title}
                    </h2>
                    <StateBadge state={elec.state} size="sm" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono mt-1 block">
                    Contest ID: {elec.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/student/receipts/HV_24F8_19C2/inclusion`}
                    className="min-h-[44px] px-3.5 py-2 font-semibold text-xs border border-slate-300 dark:border-[#1E3352] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
                    <span>Inclusion Proofs</span>
                  </Link>
                  <Link
                    href={`/results`}
                    className="min-h-[44px] px-3.5 py-2 font-bold text-xs bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] hover:bg-[#157E92]/20 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>View Certified Tally</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Cryptographic Ledger Table */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-sans font-semibold text-slate-700 dark:text-slate-300">
                    <FileCheck className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                    <span>Manifest Digest (RFC 8785 Canonical JSON)</span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-md">
                    {elec.manifest_digest}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-sans font-semibold text-slate-700 dark:text-slate-300">
                    <Layers className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
                    <span>Final Witness Checkpoint Root (RFC 9162 Log)</span>
                  </div>
                  <span className="text-[#15805D] font-bold truncate max-w-md">
                    {evidence.final_checkpoint_digest}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-sans font-semibold text-slate-700 dark:text-slate-300">
                    <Globe className="w-4 h-4 text-[#157E92]" aria-hidden="true" />
                    <span>Consortium Chain Anchor Transaction</span>
                  </div>
                  <span className="text-[#157E92] font-bold truncate max-w-md">
                    {evidence.anchor_tx_hash}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-[#1E3352] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-sans font-semibold text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
                    <span>Independent Auditor Signature</span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-md">
                    {evidence.auditor_signature}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
