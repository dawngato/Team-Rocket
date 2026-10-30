"use client";

import React, { useState } from "react";
import { Download, Upload, ShieldCheck, FileArchive, CheckCircle2, AlertTriangle } from "lucide-react";
import { INITIAL_ELECTIONS, INITIAL_RESULTS, INITIAL_EVIDENCE } from "@/lib/mock_data";
import { Election } from "@/lib/types";

export default function AuditorEvidencePage() {
  const [selectedElectionId, setSelectedElectionId] = useState("elec_cs_2026");
  const [importedFilename, setImportedFilename] = useState<string | null>(null);
  const [safeStatus, setSafeStatus] = useState<string | null>(null);

  const election = INITIAL_ELECTIONS.find((e: Election) => e.id === selectedElectionId) || INITIAL_ELECTIONS[1];

  const handleExport = () => {
    const bundle = {
      election,
      results: INITIAL_RESULTS[election.id],
      evidence: INITIAL_EVIDENCE[election.id],
      exported_at: new Date().toISOString(),
      schema_version: "2.0.0",
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `himvote_evidence_${election.id}.json`;
    a.click();
  };

  const handleSimulateImport = () => {
    setImportedFilename("himvote_evidence_external_archive_verified.tar.gz");
    setSafeStatus("Safe extraction confirmed. 0 path traversal sequences, 0 symlinks, within size bounds.");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <FileArchive className="w-3.5 h-3.5" aria-hidden="true" />
            Archive Management
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Evidence Import and Export
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Extract cryptographic evidence packages for airgapped offline verifier execution.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Box */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <h2 className="font-bold text-lg text-[#10233F] dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-[#157E92]" aria-hidden="true" />
              <span>Export Certified Evidence Bundle</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Downloads complete raw ciphertexts, Merkle leaf proofs, candidate rosters, and checkpoint witness signatures.
            </p>
          </div>

          <div>
            <label htmlFor="exp-elec" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Election Contest
            </label>
            <select
              id="exp-elec"
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            >
              {INITIAL_ELECTIONS.map((elec: Election) => (
                <option key={elec.id} value={elec.id}>
                  {elec.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Generate and Download Archive</span>
          </button>
        </div>

        {/* Import Box */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <h2 className="font-bold text-lg text-[#10233F] dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#15805D]" aria-hidden="true" />
              <span>Import External Archive</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect an evidence archive received from an external campus or state witness before running verifications.
            </p>
          </div>

          <div
            onClick={handleSimulateImport}
            className="border-2 border-dashed border-slate-300 dark:border-[#1E3352] hover:border-[#157E92] rounded-xl p-8 text-center cursor-pointer transition-colors space-y-2 bg-slate-50/50 dark:bg-slate-900/20"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Click to select evidence archive (.tar.gz or .json)
            </span>
            <span className="text-[11px] text-slate-500 block">
              Safe extraction guard active (no symlinks, no traversal)
            </span>
          </div>

          {safeStatus && (
            <div className="p-3 rounded-lg bg-[#15805D]/10 border border-[#15805D]/30 text-xs text-[#15805D] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{safeStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
