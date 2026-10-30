import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Terminal, FileCode2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#FAFBFD] border-t border-slate-200/80 text-slate-500 text-xs py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight">CAMPUS VAULT</span>
            </div>
            <p className="text-slate-500 max-w-md leading-relaxed text-xs">
              Cryptographically verified electronic voting system for university elections. Built with
              isolated privacy boundaries, SHA-256 Merkle trees, and Ed25519 digital signature
              checkpoints for mathematical proof of election integrity.
            </p>
            <div className="mt-4 flex items-center gap-2 text-slate-500 text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Educational Civic Tech Prototype • Veritas Metropolitan University</span>
            </div>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold mb-3 text-xs tracking-wider uppercase">
              Verifiability
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/verify" className="hover:text-slate-900 transition-colors">
                  Standalone Independent Verifier
                </Link>
              </li>
              <li>
                <Link href="/student/verify-receipt" className="hover:text-slate-900 transition-colors">
                  Ballot Inclusion Checker
                </Link>
              </li>
              <li>
                <Link href="/auditor" className="hover:text-slate-900 transition-colors">
                  Auditor Inspection Lab
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-slate-900 transition-colors">
                  Threat Model & Limitations
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold mb-3 text-xs tracking-wider uppercase">
              Role Portals
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/student" className="hover:text-slate-900 transition-colors">
                  Student Voting Booth
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-slate-900 transition-colors">
                  Election Administration
                </Link>
              </li>
              <li>
                <Link href="/admin/audit" className="hover:text-slate-900 transition-colors">
                  Append-Only Audit Trail
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Protocol v1.0 • Ed25519 & SHA-256</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <p>© 2026 Campus Vault Project. Provided strictly as an educational cyber prototype.</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Lock className="w-3.5 h-3.5 text-teal-600" /> End-to-End Verifiable
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <Terminal className="w-3.5 h-3.5 text-brand-600" /> Standalone Python CLI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
