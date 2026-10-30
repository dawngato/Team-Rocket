"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StateBadge } from "../../../../components/StateBadge";
import { INITIAL_ELECTIONS } from "../../../../lib/mock_data";
import { Candidate } from "../../../../lib/types";
import { Plus, Trash2, ArrowRight, UserCheck, ShieldAlert } from "lucide-react";

export default function OfficerCandidateManagementPage() {
  const params = useParams();
  const electionId = params?.id as string;
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  const [candidates, setCandidates] = useState<Candidate[]>(election.candidates || []);
  const [candName, setCandName] = useState("");
  const [statement, setStatement] = useState("");
  const isFrozen = election.state !== "DRAFT";

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFrozen) return;
    const newCand: Candidate = {
      id: `cand_${Date.now()}`,
      name: candName,
      contest: election.contest || "Council Representative",
      statement,
    };
    setCandidates([...candidates, newCand]);
    setCandName("");
    setStatement("");
  };

  const handleRemove = (id: string) => {
    if (isFrozen) return;
    setCandidates(candidates.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Candidate Roster Management
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            {election.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Register and review ballot contestants before freezing the election manifest.
          </p>
        </div>
        <StateBadge state={election.state} size="md" />
      </div>

      {isFrozen && (
        <div className="p-4 rounded-xl bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 text-[#AA6C0B] text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Election manifest is locked. Candidates cannot be added, edited, or removed after manifest freeze.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {!isFrozen && (
          <div className="lg:col-span-5">
            <form
              onSubmit={handleAddCandidate}
              className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
            >
              <h2 className="font-bold text-base text-[#10233F] dark:text-white">
                Add Contestant
              </h2>

              <div>
                <label htmlFor="cand-name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Full Name
                </label>
                <input
                  id="cand-name-input"
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="e.g. Aditi Rao"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
                />
              </div>

              <div>
                <label htmlFor="cand-statement-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Platform Statement
                </label>
                <textarea
                  id="cand-statement-input"
                  required
                  rows={3}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Summary of student platform and priorities..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Candidate to Manifest</span>
              </button>
            </form>
          </div>
        )}

        <div className={isFrozen ? "lg:col-span-12 space-y-4" : "lg:col-span-7 space-y-4"}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#10233F] dark:text-white">
              Registered Candidates ({candidates.length})
            </h2>
            <Link
              href={`/officer/elections/${election.id}/roster`}
              className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>Next: Review Voter Roster</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="space-y-3">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-2 flex items-start justify-between"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                    {c.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono block">
                    Contest: {c.contest}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
                    {c.statement}
                  </p>
                </div>
                {!isFrozen && (
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    className="p-2 text-slate-400 hover:text-[#C23C45] transition-colors"
                    aria-label={`Remove candidate ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
