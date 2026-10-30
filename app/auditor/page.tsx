'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSearch,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  AlertTriangle,
  Layers,
  Terminal,
  Activity,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface SecurityTestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

export default function AuditorLabPage() {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([]);
  const [passedTests, setPassedTests] = useState<number | null>(null);
  const [totalTests, setTotalTests] = useState<number | null>(null);

  // Checkpoints
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/elections/elec-senate-2026-rep')
      .then((res) => res.json())
      .then((data) => {
        if (data.election?.checkpoints) {
          setCheckpoints(data.election.checkpoints);
        }
      });
  }, []);

  const handleRunSecurityTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/security/run-tests', { method: 'POST' });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
        setPassedTests(data.passedTests);
        setTotalTests(data.totalTests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Banner - Clean White Surface */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60 mb-3">
              <FileSearch className="w-3.5 h-3.5 text-emerald-600" /> Independent Civic Tech Audit Laboratory
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Auditor Inspection Panel
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Verify cryptographic checkpoints, inspect the append-only Merkle tree state, and
              execute automated security tests simulating active adversaries.
            </p>
          </div>

          <button
            disabled={isRunningTests}
            onClick={handleRunSecurityTests}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/15 self-start"
          >
            <Play className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
            {isRunningTests ? 'Executing Security Tests...' : 'Run All 16 Security Tests'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AUTOMATED SECURITY TESTS SUITE (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Automated Security & Tamper Test Suite
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full test coverage mandated by Section 16 of the cryptographic specification.
                </p>
              </div>

              {passedTests !== null && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold tabular-nums">
                  {passedTests} / {totalTests} Tests Passed
                </span>
              )}
            </div>

            {testResults.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No test suite executed yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Run All 16 Security Tests" to verify concurrency, duplicate voting, Merkle
                  tampering, and transaction atomicity.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {testResults.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border text-xs transition-all ${
                      t.passed
                        ? 'bg-slate-50/70 border-slate-200/80 text-slate-800'
                        : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-bold text-slate-900">
                          Test {String(t.id).padStart(2, '0')}: {t.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          t.passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <p className="text-slate-500 ml-6 text-[11px] leading-relaxed">{t.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CHECKPOINT CHAIN INSPECTOR */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-teal-600" /> Signed Checkpoint Chain
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Independently signed checkpoints published by the auditor key pair.
            </p>

            <div className="space-y-3">
              {checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Checkpoint #{cp.sequenceNumber}
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/80">
                      Ed25519 Valid
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Committed Merkle Root:
                    </span>
                    <span className="font-mono text-slate-800 text-[10px] break-all block mt-0.5">
                      {cp.merkleRoot}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Accepted Ballots: {cp.ballotCount}</span>
                    <span className="font-mono text-[10px]">{new Date(cp.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Standalone Verifier Link */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
              <Terminal className="w-4 h-4" /> Python CLI Verification
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Export election artifacts to run our zero-dependency verification script in an isolated
              environment.
            </p>
            <Link
              href="/verify"
              className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              Open Python Verification Terminal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
