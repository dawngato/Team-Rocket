import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  Terminal,
  AlertTriangle,
  Layers,
  Key,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export default function SecuritySpecsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 text-xs font-semibold border border-blue-500/20 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Formal Cryptographic Specification
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Security Architecture & Threat Model
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Campus Vault is architected to guarantee ballot integrity, voter privacy, and independent
          verifiability without relying blindly on administrator claims or centralized database
          trust.
        </p>
      </div>

      <div className="space-y-10">
        {/* SECTION 1: PRIVACY BOUNDARY */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">1. Voter Privacy & Anonymity</h2>
              <span className="text-xs text-slate-400">Strict Identity Decoupling</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-3">
            <p>
              In traditional web applications, a foreign key connects a user record directly to their
              choice (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">user_id → candidate_id</code>).
              In Campus Vault, this relationship is strictly prohibited at the database schema level.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 font-mono text-[11px]">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">
                  Table: VoterEligibility
                </span>
                <p className="text-slate-500 font-sans">
                  Stores student credentials and marks whether the voting entitlement has been
                  consumed (<code className="font-mono">hasVoted: true</code>). It contains ZERO
                  candidate data.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Table: AcceptedBallot</span>
                <p className="text-slate-500 font-sans">
                  Stores the candidate choice and cryptographic leaf hash. It contains NO student
                  identifier, user ID, or network IP address.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CRYPTOGRAPHIC INTEGRITY */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                2. Cryptographic Ballot Commitments
              </h2>
              <span className="text-xs text-slate-400">SHA-256 Merkle Trees & Ed25519 Signatures</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-3">
            <p>
              Every accepted ballot is canonicalized using deterministic JSON sorting and domain
              separated before hashing:
            </p>
            <div className="p-4 rounded-2xl bg-slate-950 text-teal-300 font-mono text-[11px] overflow-x-auto select-all">
              H(leaf) = SHA256("CV:LEAF:v1:" + CanonicalJSON(ballot))<br />
              H(node) = SHA256("CV:NODE:v1:" + LeftChildHash + RightChildHash)
            </div>
            <p>
              Domain separation strictly prevents second-preimage collision attacks. When the tree has
              an odd number of leaves, the final leaf is paired with itself in compliance with
              canonical Merkle specifications.
            </p>
          </div>
        </section>

        {/* SECTION 3: THREAT MODEL */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">3. Adversary Profiles Handled</h2>
              <span className="text-xs text-slate-400">Threat Model & Defense Capabilities</span>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">
                Adversary 1: Malicious Student (Double Voting & Concurrency)
              </span>
              <p>
                <strong>Defense:</strong> Database-backed atomic transactions and uniqueness
                constraints ensure racing HTTP requests or duplicate clicks cannot produce more than
                one accepted ballot.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">
                Adversary 2: Rogue Database Administrator (Ballot Modification / Omission)
              </span>
              <p>
                <strong>Defense:</strong> If an administrator alters or removes a previously cast
                ballot in the database, the recomputed Merkle root immediately mismatches the
                independently retained signed checkpoint.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">
                Adversary 3: Untrusted Network Observer (Eavesdropping & Coercion)
              </span>
              <p>
                <strong>Defense:</strong> Ballot receipts contain ONLY non-revealing tracking hashes.
                A student cannot use their receipt to prove to an external party how they voted,
                mitigating vote buying and coercion.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: KNOWN LIMITATIONS */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                4. Honest Limitations & Disclosures
              </h2>
              <span className="text-xs text-slate-400">Prototype Boundary Definition</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-2">
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Client Compromise:</strong> If malware or browser extensions compromise the
                student's device, the payload may be altered before cryptographic submission.
              </li>
              <li>
                <strong>Traffic Metadata Correlation:</strong> While identity is separated from the
                ballot row, microsecond network timing correlation on low-traffic servers could
                potentially allow inferences if logs are captured.
              </li>
              <li>
                <strong>Educational Prototype:</strong> This software is designed for university
                hackathons and cybersecurity demonstrations and has not undergone certified federal
                election compliance audits.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
