"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, ArrowRight, CheckCircle2, Calendar, FileText } from "lucide-react";
import { apiClient } from "../../../lib/api_client";

export default function CreateElectionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [contest, setContest] = useState("");
  const [selectionRule, setSelectionRule] = useState("Single choice plurality");
  const [minTurnout, setMinTurnout] = useState(25);
  const [opensAt, setOpensAt] = useState("2026-11-20T09:00");
  const [closesAt, setClosesAt] = useState("2026-11-27T18:00");
  const [cutoff, setCutoff] = useState("2026-11-20T08:00");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiClient.createElection({
        title,
        contest,
        selection_rule: selectionRule,
        min_anonymous_turnout: Number(minTurnout),
        opens_at_utc: new Date(opensAt).toISOString(),
        closes_at_utc: new Date(closesAt).toISOString(),
        issuance_cutoff_utc: new Date(cutoff).toISOString(),
        description,
        eligible_count: 500,
        candidates: [
          {
            id: `cand_${Date.now()}_1`,
            name: "Candidate Example A",
            contest,
            statement: "Dedicated to student advocacy and research.",
          },
          {
            id: `cand_${Date.now()}_2`,
            name: "Candidate Example B",
            contest,
            statement: "Committed to campus sustainability and sports.",
          },
        ],
      });
      router.push(`/officer/elections/${created.id}/candidates`);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] mb-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            Election Officer Authority
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Create Election Draft
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Configure contest parameters, voting rules, and cutoff schedule for institutional balloting.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label htmlFor="elec-title" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Election Title
            </label>
            <input
              id="elec-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Department of Mechanical Engineering Student Delegate Election 2026"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="elec-contest" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Contest or Seat Name
            </label>
            <input
              id="elec-contest"
              type="text"
              required
              value={contest}
              onChange={(e) => setContest(e.target.value)}
              placeholder="e.g. Executive Student Councillor"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="elec-rule" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Voting and Selection Rule
            </label>
            <select
              id="elec-rule"
              value={selectionRule}
              onChange={(e) => setSelectionRule(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            >
              <option value="Single choice plurality">Single choice plurality</option>
              <option value="Ranked choice instant runoff">Ranked choice instant runoff</option>
              <option value="Approval voting multi seat">Approval voting multi seat</option>
            </select>
          </div>

          <div>
            <label htmlFor="elec-opens" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Opening Time (Local)
            </label>
            <input
              id="elec-opens"
              type="datetime-local"
              required
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="elec-closes" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Closing Time (Local)
            </label>
            <input
              id="elec-closes"
              type="datetime-local"
              required
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="elec-cutoff" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Credential Issuance Cutoff
            </label>
            <input
              id="elec-cutoff"
              type="datetime-local"
              required
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div>
            <label htmlFor="elec-min-turnout" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Minimum Anonymous Turnout Threshold
            </label>
            <input
              id="elec-min-turnout"
              type="number"
              min={5}
              max={1000}
              required
              value={minTurnout}
              onChange={(e) => setMinTurnout(Number(e.target.value))}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="elec-desc" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
              Election Description and Charter
            </label>
            <textarea
              id="elec-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context regarding candidate eligibility and council duties..."
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-[#1E3352] flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span>Create Draft and Proceed to Candidate Setup</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
