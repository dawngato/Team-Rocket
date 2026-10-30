'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  User,
  CheckCircle2,
  ChevronDown,
  Lock,
  Award,
  FileSearch,
  Vote,
  Sparkles,
  LogOut,
  LogIn,
} from 'lucide-react';

interface AuthUser {
  id: string;
  studentId: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'ADMIN' | 'AUDITOR';
  department: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user) setUser(data.user);
      if (data.allUsers) setAllUsers(data.allUsers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const switchAccount = async (targetUserId: string) => {
    setIsSwitching(true);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setDropdownOpen(false);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-md shadow-brand-500/15 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight flex items-center gap-1.5 text-slate-900">
                  CAMPUS VAULT
                  <span className="text-[10px] uppercase tracking-wider bg-brand-50 text-brand-600 font-bold px-1.5 py-0.5 rounded-full border border-brand-100">
                    Verifiable
                  </span>
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">
                  Veritas Metropolitan University
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1 ml-8">
              <Link
                href="/elections"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/elections'
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Elections
              </Link>
              <Link
                href="/elections/elec-spring-2026-pres/live"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  pathname.includes('/live')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-sm'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Results & Charts
              </Link>
              <Link
                href="/verify"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/verify'
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Verify Election
              </Link>
              <Link
                href="/security"
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/security'
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Security Specs
              </Link>
            </div>
          </div>

          {/* Right Action & Authentication Panel */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-500/20"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all shadow-sm"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Register</span>
                </Link>
              </>
            ) : (
              <>
                {/* Quick Portal Shortcuts based on Role */}
                {user.role === 'STUDENT' && (
                  <Link
                    href="/student"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-50 text-brand-700 border border-brand-200/80 hover:bg-brand-100/70 transition-all shadow-sm"
                  >
                    <Award className="w-3.5 h-3.5 text-brand-600" />
                    Student Portal
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/70 transition-all shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Admin Dashboard
                  </Link>
                )}

                {user.role === 'AUDITOR' && (
                  <Link
                    href="/auditor"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70 transition-all shadow-sm"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-emerald-600" />
                    Auditor Lab
                  </Link>
                )}

                {/* Authenticated User Menu Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-all shadow-sm"
                    title="Account details and switcher"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                      {user.name.charAt(0)}
                    </div>
                    <div className="text-left hidden sm:block">
                      <span className="block font-bold text-slate-900 leading-tight">
                        {user.name}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-medium">
                        {user.role} • {user.studentId}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                            Signed In As
                          </span>
                          <span className="text-xs font-bold text-slate-800">{user.name}</span>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" />
                          Sign Out
                        </button>
                      </div>

                      <div className="px-3 py-1.5 bg-slate-50/30 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Switch Authenticated Profile
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {allUsers.map((u) => {
                          const isCurrent = user.id === u.id;
                          return (
                            <button
                              key={u.id}
                              disabled={isSwitching}
                              onClick={() => switchAccount(u.id)}
                              className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${
                                isCurrent ? 'bg-brand-50/50' : ''
                              }`}
                            >
                              <div
                                className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  u.role === 'ADMIN'
                                    ? 'bg-amber-100 text-amber-800'
                                    : u.role === 'AUDITOR'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-brand-100 text-brand-700'
                                }`}
                              >
                                {u.role[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {u.name}
                                  </span>
                                  {isCurrent && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                                  )}
                                </div>
                                <span className="block text-[10px] text-slate-500 truncate">
                                  {u.department}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {u.studentId}
                                  </span>
                                  <span className="text-[9px] font-semibold text-slate-500 uppercase">
                                    {u.role}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                        <button
                          onClick={handleLogout}
                          className="w-full py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 text-slate-500" />
                          Sign Out of Campus Vault
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
