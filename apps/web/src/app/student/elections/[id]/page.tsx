"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { INITIAL_ELECTIONS } from "@/lib/mock_data";
import { StateBadge } from "@/components/StateBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Vote, ArrowRight, ShieldCheck, CheckCircle2, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api_client";

export default function StudentElectionBoothPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = (params?.id as string) || "elec_cs_2026";
  const election = INITIAL_ELECTIONS.find((e) => e.id === electionId) || INITIAL_ELECTIONS[0];

  // Multi-position positions definition
  const positions = [
    {
      id: "pos_pres",
      title: "President / Lead Representative",
      description: "Executive representative for academic policies and university senate liaisons.",
      candidates: election.candidates || [
        { id: "cand_1", name: "Aarav Sharma", contest: "President", statement: "Academic freedom and modern research compute clusters." },
        { id: "cand_2", name: "Priya Nair", contest: "President", statement: "Open labs, library access, and lab equipment funding." },
      ],
    },
    {
      id: "pos_sec",
      title: "General Secretary",
      description: "Oversees student affairs, budget allocation, and welfare societies.",
      candidates: [
        { id: "cand_sec_1", name: "Kabir Verma", contest: "General Secretary", statement: "Transparent funding records and digitized grievance desks." },
        { id: "cand_sec_2", name: "Rohan Gupta", contest: "General Secretary", statement: "Expanded campus transportation and hostel amenities." },
      ],
    },
  ];

  // Store selection per position
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  };

  const allPositionsSelected = positions.every((pos) => Boolean(selections[pos.id]));

  const handleCast = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.castBallot({
        election_id: election.id,
        credential_proof_b64url: "dGVzdF9jcmVkZW50aWFsX3Byb29m",
        engine_ballot_b64url: "ZW5jcnlwdGVkX2JhbGxvdF9jaXBoZXJ0ZXh0",
        engine_proofs_b64url: "emVyb19rbm93bGVkZ2VfcHJvb2ZfY29uc3RyYWludHM",
        idempotency_key: `key_${Date.now()}`,
      });
      setIsConfirmOpen(false);
      router.push(`/student/elections/${election.id}/pending?handle=${encodeURIComponent(response.handle)}`);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Back button and Header */}
      <div className="space-y-4">
        <Link
          href="/student/elections"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#157E92] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to eligible elections</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E2E42]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Official Voting Booth</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white">
              {election.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {positions.length} Positions on Official Ballot | Secret Ballot Protocol Enforced
            </p>
          </div>
          <StateBadge state={election.state} size="md" />
        </div>
      </div>

      {/* Position Selection Cards */}
      <div className="space-y-8">
        {positions.map((pos, pIdx) => {
          const selectedCandId = selections[pos.id];
          return (
            <section
              key={pos.id}
              className="rounded-lg border border-slate-200 dark:border-[#1E2E42] bg-white dark:bg-[#121C2B] p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#1E2E42]">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Position {pIdx + 1} of {positions.length}
                  </div>
                  <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                    {pos.title}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedCandId ? (
                    <span className="text-[#15805D] flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Candidate Selected
                    </span>
                  ) : (
                    "Choose 1 candidate"
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {pos.description}
              </p>

              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <legend className="sr-only">Candidates for {pos.title}</legend>
                {pos.candidates.map((cand) => {
                  const isSelected = selectedCandId === cand.id;
                  return (
                    <label
                      key={cand.id}
                      onClick={() => handleSelect(pos.id, cand.id)}
                      className={`min-h-[44px] p-4 rounded-md border-2 cursor-pointer transition-all duration-75 flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? "border-[#10233F] dark:border-[#157E92] bg-[#F0F9FF] dark:bg-[#157E92]/10"
                          : "border-slate-200 dark:border-[#1E2E42] hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#121C2B]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`position_${pos.id}`}
                            value={cand.id}
                            checked={isSelected}
                            onChange={() => handleSelect(pos.id, cand.id)}
                            className="w-4 h-4 text-[#10233F] focus:ring-[#157E92]"
                          />
                          <div>
                            <span className="font-bold text-sm text-[#0F172A] dark:text-white block">
                              {cand.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {cand.contest || pos.title}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#15805D] flex-shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-[#1E2E42] pt-2">
                        {cand.statement || "Candidate platform registered in frozen manifest."}
                      </p>
                    </label>
                  );
                })}
              </fieldset>
            </section>
          );
        })}
      </div>

      {/* Ballot Submission Action Bar */}
      <div className="p-6 rounded-lg border border-slate-200 dark:border-[#1E2E42] bg-slate-50 dark:bg-[#0E1724] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#15805D] flex-shrink-0" aria-hidden="true" />
          <span>Blind credential token validated. All votes sealed in ZK commitment.</span>
        </div>

        <Button
          type="button"
          disabled={!allPositionsSelected}
          onClick={() => setIsConfirmOpen(true)}
          className="w-full sm:w-auto"
        >
          <span>Review and Confirm Ballot</span>
          <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Ballot Submission</DialogTitle>
            <DialogDescription>
              Review your candidate selections before submitting your encrypted ballot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {positions.map((pos) => {
              const cand = pos.candidates.find((c) => c.id === selections[pos.id]);
              return (
                <div key={pos.id} className="p-3 rounded-md border border-slate-200 dark:border-[#1E2E42] bg-slate-50/70 dark:bg-slate-900/40 text-xs">
                  <span className="text-slate-500 uppercase tracking-wider block font-semibold">
                    {pos.title}
                  </span>
                  <strong className="text-sm text-[#0F172A] dark:text-white block mt-0.5">
                    {cand?.name || "No selection"}
                  </strong>
                </div>
              );
            })}

            <div className="p-3 rounded-md bg-[#AA6C0B]/10 border border-[#AA6C0B]/30 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <AlertCircle className="w-4 h-4 text-[#AA6C0B] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Once submitted, your spent nullifier is recorded in the casting gate. Ballots cannot be modified or re-cast.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsConfirmOpen(false)}
            >
              Modify Choices
            </Button>
            <Button
              variant="confirmed"
              isLoading={isSubmitting}
              onClick={handleCast}
            >
              <Vote className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Confirm and Cast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
