'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  UserCheck,
  Building,
  KeyRound,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'ADMIN' | 'AUDITOR'>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHelper, setShowHelper] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          expectedRole: activeTab,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Database credential check failed.');
      }

      // Redirect based on role
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.user.role === 'AUDITOR') {
        router.push('/auditor');
      } else {
        router.push('/student');
      }
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  const autofillDemo = (idVal: string, passVal: string, role: 'STUDENT' | 'ADMIN' | 'AUDITOR') => {
    setActiveTab(role);
    setIdentifier(idVal);
    setPassword(passVal);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#FAFBFD] to-white">
      <div className="w-full max-w-lg">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
          {/* Luminous Brand Pill */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center tracking-tight">
            Campus Vault Authentication
          </h1>
          <p className="text-xs text-slate-500 text-center mt-1.5 max-w-sm mx-auto">
            Strict database-verified credentials required. Random or unauthorized credentials will be
            rejected.
          </p>

          {/* Role Switcher Tabs */}
          <div className="mt-6 p-1 bg-slate-100/80 rounded-2xl flex items-center gap-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('STUDENT');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'STUDENT'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ADMIN');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'ADMIN'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('AUDITOR');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'AUDITOR'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Auditor
            </button>
          </div>

          {/* Error Message with Shake Feedback */}
          {errorMsg && (
            <div className="mt-5 p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Access Denied</span>
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {activeTab === 'STUDENT'
                  ? 'Student ID or Campus Email'
                  : activeTab === 'ADMIN'
                  ? 'Administrator ID or Email'
                  : 'Auditor ID or Email'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={
                    activeTab === 'STUDENT'
                      ? 'e.g. STU-2026-001 or alex.chen@student.veritas.edu'
                      : activeTab === 'ADMIN'
                      ? 'e.g. ADM-001 or aris.thorne@veritas.edu'
                      : 'e.g. AUD-001 or elena.rostova@auditing-standards.org'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password / Security Key
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your confidential password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                activeTab === 'STUDENT'
                  ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20 hover:-translate-y-0.5'
                  : activeTab === 'ADMIN'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20 hover:-translate-y-0.5'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 hover:-translate-y-0.5'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Database Records...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate & Enter {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant (for Judges & Evaluators) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowHelper(!showHelper)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                Verified Database Demo Credentials (1-Click Fill)
              </span>
              {showHelper ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showHelper && (
              <div className="mt-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-2 text-[11px] animate-in fade-in duration-200">
                <p className="text-slate-500 text-[10px] leading-relaxed">
                  These accounts exist in the SQLite database and have been salted with cryptographic PBKDF2 hashes.
                  Click any account to pre-fill:
                </p>

                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => autofillDemo('STU-2026-001', 'Student@2026', 'STUDENT')}
                    className="w-full text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">Alex Chen (Student)</span>
                      <span className="block text-[10px] text-slate-400 font-mono">STU-2026-001 • Student@2026</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                      Fill
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => autofillDemo('ADM-001', 'Admin@2026', 'ADMIN')}
                    className="w-full text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">Dr. Aris Thorne (Admin)</span>
                      <span className="block text-[10px] text-slate-400 font-mono">ADM-001 • Admin@2026</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                      Fill
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => autofillDemo('AUD-001', 'Auditor@2026', 'AUDITOR')}
                    className="w-full text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">Elena Rostova (Auditor)</span>
                      <span className="block text-[10px] text-slate-400 font-mono">AUD-001 • Auditor@2026</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      Fill
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 text-center text-xs text-slate-500">
            Need a student account?{' '}
            <Link href="/register" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
              Register your Student ID
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
