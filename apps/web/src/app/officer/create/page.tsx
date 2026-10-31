"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, ArrowRight, CheckCircle2, Calendar, FileText, AlertCircle, RefreshCw } from "lucide-react";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timezone display
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Contextual schedule validation (UX-25)
    const cutoffDate = new Date(cutoff);
    const openDate = new Date(opensAt);
    const closeDate = new Date(closesAt);

    if (cutoffDate > openDate) {
      setErrorMessage("Issuance cutoff must occur before or at the moment the election opens.");
      return;
    }

    if (openDate >= closeDate) {
      setErrorMessage("Opening time must be strictly before closing time.");
      return;
    }

    setSubmitting(true);
    try {
      // UX-22: Create election with clean empty candidates list (no injected fictional candidates)
      const created = await apiClient.createElection({
        title,
        contest,
        selection_rule: selectionRule,
        min_anonymous_turnout: Number(minTurnout),
        opens_at_utc: openDate.toISOString(),
        closes_at_utc: closeDate.toISOString(),
        issuance_cutoff_utc: cutoffDate.toISOString(),
        description,
        eligible_count: 0,
        candidates: [], // Clean empty list; officer adds actual candidates in step 2
      });
      // Redirect to candidate setup
      router.push(`/officer/elections/${created.id}/candidates`);
    } catch (err: unknown) {
      // UX-21: Show explicit error, preserve form values, and do not fail silently
      setErrorMessage(
        err instanceof Error
          ? `Election draft could not be saved: ${err.message}. Your form entries have been preserved.`
          : "Election draft could not be saved because the election service is unavailable. Your form entries have been preserved."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#AA6C0B]/10 text-[#AA6C0B] mb-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Election Commission Workflow</span>
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Create Election Draft
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Step 1 of 5: Establish core parameters. Candidate setup follows draft creation.
          </p>
        </div>
      </div>

      {/* UX-21: Error summary banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <strong className="block font-semibold mb-0.5">Draft Creation Failed</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-6">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#157E92]" />
            <span>Contest Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="election-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Election Title *
              </label>
              <input
                id="election-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Student Union Council 2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="election-contest" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Contest / Office *
              </label>
              <input
                id="election-contest"
                type="text"
                required
                value={contest}
                onChange={(e) => setContest(e.target.value)}
                placeholder="e.g., Executive President Slate"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="election-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Description &amp; Purpose
            </label>
            <textarea
              id="election-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context regarding eligible departments, voter qualifications, and representation scope..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* UX-23: Supported Ballot Type */}
            <div>
              <label htmlFor="selection-rule" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Supported Ballot Rule *
              </label>
              <select
                id="selection-rule"
                value={selectionRule}
                onChange={(e) => setSelectionRule(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="Single choice plurality">Single choice plurality (Profile VEEM Verified)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Profile VEEM engine currently supports and verifies single-choice plurality ballots.
              </p>
            </div>

            <div>
              <label htmlFor="min-turnout" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Anonymity Suppression Threshold
              </label>
              <input
                id="min-turnout"
                type="number"
                min={20}
                value={minTurnout}
                onChange={(e) => setMinTurnout(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Cohorts below this turnout will be flagged PRIVACY_LIMITED to prevent demographic elimination.
              </p>
            </div>
          </div>
        </div>

        {/* Schedule & Timezone Card */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#10233F] dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#157E92]" />
              <span>Election Schedule</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Timezone: {localTimezone}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cutoff-time" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Issuance Cutoff *
              </label>
              <input
                id="cutoff-time"
                type="datetime-local"
                required
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="opens-at" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Polling Opens *
              </label>
              <input
                id="opens-at"
                type="datetime-local"
                required
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="closes-at" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Polling Closes *
              </label>
              <input
                id="closes-at"
                type="datetime-local"
                required
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0E1A2B] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#157E92] hover:bg-[#116676] text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating Draft...</span>
              </>
            ) : (
              <>
                <span>Save Draft &amp; Proceed to Candidates</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
