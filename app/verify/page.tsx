'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Terminal,
  Play,
  Download,
  ExternalLink,
  Layers,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';

interface VerificationCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

function VerificationPortalContent() {
  const searchParams = useSearchParams();
  const queryElecId = searchParams.get('electionId') || '';

  const [elections, setElections] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState(queryElecId);
  const [isRunning, setIsRunning] = useState(false);
  const [pyOutput, setPyOutput] = useState<string | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/elections')
      .then((res) => res.json())
      .then((data) => {
        if (data.elections) {
          setElections(data.elections);
          if (!selectedElectionId && data.elections.length > 0) {
            setSelectedElectionId(data.elections[0].id);
          }
        }
      });
  }, []);

  const handleRunPythonVerifier = async () => {
    setIsRunning(true);
    setPyOutput(null);
    setExitCode(null);

    try {
      const res = await fetch('/api/security/verify-py', { method: 'POST' });
      const data = await res.json();
      setPyOutput(data.stdout + (data.stderr ? `\nSTDERR:\n${data.stderr}` : ''));
      setExitCode(data.exitCode);
    } catch (e: any) {
      setPyOutput(`Error executing Python verifier: ${e.message}`);
      setExitCode(1);
    } finally {
      setIsRunning(false);
    }
  };

  const selectedElection = elections.find((e) => e.id === selectedElectionId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-800 text-xs font-semibold border border-teal-500/20 mb-3">
          <Terminal className="w-3.5 h-3.5 text-teal-600" /> Standalone Python Verification Script
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Independent Election Verification
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          The election verifier operates strictly as an independent evaluator without trusting the
          running web application or administrator database. It reconstructs the SHA-256 Merkle tree
          from raw ballot JSONL records and validates Ed25519 digital signatures.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Audit Target
            </span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5">
              University Senate Faculty-Student Representative 2026 (elec-senate-2026-rep)
            </span>
            <span className="text-xs text-slate-500">
              Exported artifacts available in repository under <code className="font-mono">artifacts/</code>
            </span>
          </div>

          <button
            disabled={isRunning}
            onClick={handleRunPythonVerifier}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm flex-shrink-0"
          >
            <Play className={`w-4 h-4 text-teal-400 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Executing Verifier...' : 'Run Standalone Verification Script'}
          </button>
        </div>
      </div>

      {/* TERMINAL OUTPUT BOX */}
      <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl font-mono text-xs mb-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-slate-400 text-xs ml-2">scripts/verify_election.py</span>
          </div>

          {exitCode !== null && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                exitCode === 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              Exit Code: {exitCode} {exitCode === 0 ? '(PASS)' : '(FAIL)'}
            </span>
          )}
        </div>

        {pyOutput ? (
          <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 font-mono text-xs select-all overflow-x-auto">
            {pyOutput}
          </pre>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <Terminal className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            Click "Run Standalone Verification Script" above to launch the Python 3 audit process.
          </div>
        )}
      </div>

      {/* ARTIFACTS EXPLANATION CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Exported Election Artifacts</h2>
        <p className="text-xs text-slate-500 mb-6">
          To run verification in an offline air-gapped terminal, inspect the following exported files
          which are completely self-contained:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">election_manifest.json</span>
            <span className="text-slate-500 text-[11px] font-sans">
              Contains election configuration, candidate list, ballot count, tally, and publication
              metadata.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">accepted_ballots.jsonl</span>
            <span className="text-slate-500 text-[11px] font-sans">
              Canonically serialized accepted ballot records with candidate IDs and non-revealing
              receipt hashes. Zero voter identities.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">signed_checkpoint.json</span>
            <span className="text-slate-500 text-[11px] font-sans">
              Sequence number, ballot count, Merkle root, and Ed25519 digital signature signed by the
              independent auditor.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">
              trusted_auditor_public_key.pem
            </span>
            <span className="text-slate-500 text-[11px] font-sans">
              Independent trust anchor public key used to verify that checkpoints originated from
              authorized auditors.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerificationPortalPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">Loading verification workspace...</div>}>
      <VerificationPortalContent />
    </Suspense>
  );
}

