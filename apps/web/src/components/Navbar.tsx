"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  ArrowRight,
  Radio,
  ChevronDown,
  FileCheck2,
  Lock,
  Layers,
  Scale,
  Eye,
  Vote,
  BarChart3,
  Search,
  Activity,
  LogOut,
  UserRound,
} from "lucide-react";
import { useApp } from "../lib/query_provider";
import { identityClient, type SessionProfile } from "../lib/identity_client";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [session, setSession] = useState<SessionProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    identityClient
      .getSession()
      .then((current) => {
        if (mounted) {
          setSession(current);
        }
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
        }
      });

    const unsubscribe = identityClient.onSessionChange((nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("himvote_session_receipts");
        window.localStorage.removeItem("himvote_receipts");
      }
      await identityClient.logout();
    } finally {
      setSession(null);
      setMobileMenuOpen(false);
      router.push("/auth/login");
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const primaryNavLinks = [
    { href: "/operations", label: "Operations Desk", icon: Activity },
    { href: "/elections", label: "Elections", icon: Vote },
    { href: "/results", label: "Results", icon: BarChart3 },
    { href: "/audit", label: "Audit Explorer", icon: Search },
  ];

  const architectureLinks = [
    {
      href: "/how-it-works",
      label: "How Verification Works",
      desc: "RFC 9474 blind signature & cryptographic voter verification flow",
      icon: Layers,
    },
    {
      href: "/security-limits",
      label: "Security Architecture & Limits",
      desc: "Classical cryptographic hardness bounds, threat model & assumptions",
      icon: Lock,
    },
    {
      href: "/accessibility",
      label: "Accessibility (WCAG 2.1 AA)",
      desc: "Institutional universal access standards & assistive technology compliance",
      icon: Eye,
    },
    {
      href: "/terms",
      label: "Governance & Terms",
      desc: "Institutional campus voting rules & ballot handling protocols",
      icon: Scale,
    },
  ];

  const isArchitectureActive = architectureLinks.some(
    (link) => pathname === link.href
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#07111e]/90 transition-colors">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="flex items-center justify-between min-h-[68px] gap-4">
          {/* Brand Logo & Institutional Tag */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group rounded-xl py-1 px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden flex items-center justify-center bg-[#07111E] border border-cyan-500/40 shadow-sm group-hover:border-cyan-400 group-hover:shadow-[0_0_16px_rgba(21,126,146,0.35)] transition-all p-0.5 shrink-0">
              <Image
                src="/himvote-logo.svg"
                alt="HimVote Institutional Logo"
                className="w-full h-full object-contain"
                width={44}
                height={44}
                priority
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#10233F] dark:text-white">
                  HimVote
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  <Shield className="w-2.5 h-2.5" />
                  Institutional
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                Campus Election &amp; Cryptographic Audit Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary institutional navigation"
            className="hidden md:flex items-center gap-1.5 lg:gap-2"
          >
            {primaryNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    isActive
                      ? "text-[#157E92] dark:text-cyan-300 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {/* Active Indicator Background Pill */}
                  {isActive && (
                    <motion.span
                      layoutId="navbar-active-indicator"
                      className="absolute inset-0 rounded-xl bg-[#157E92]/10 dark:bg-cyan-500/15 border border-[#157E92]/20 dark:border-cyan-500/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Interactive Hover Glow Effect */}
                  <span
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 dark:from-cyan-400/15 dark:to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none -z-10 shadow-[0_0_14px_rgba(21,126,146,0.18)]"
                    aria-hidden="true"
                  />

                  <span className="relative z-10 flex items-center gap-1.5">
                    {link.label}
                  </span>
                </Link>
              );
            })}

            {/* Architecture & Standards Interactive Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onMouseEnter={() => setDropdownOpen(true)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-controls="architecture-dropdown-menu"
                className={`group relative px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold inline-flex items-center gap-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  isArchitectureActive || dropdownOpen
                    ? "text-[#157E92] dark:text-cyan-300 font-bold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {/* Active Indicator Background Pill */}
                {isArchitectureActive && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute inset-0 rounded-xl bg-[#157E92]/10 dark:bg-cyan-500/15 border border-[#157E92]/20 dark:border-cyan-500/25 -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Interactive Hover Glow */}
                <span
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 dark:from-cyan-400/15 dark:to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none -z-10 shadow-[0_0_14px_rgba(21,126,146,0.18)]"
                  aria-hidden="true"
                />

                <span className="relative z-10">Architecture &amp; Security</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180 text-cyan-600 dark:text-cyan-400" : "text-slate-400"
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Animated Dropdown Menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    id="architecture-dropdown-menu"
                    role="menu"
                    aria-label="Architecture and Security Submenu"
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onMouseLeave={() => setDropdownOpen(false)}
                    className="absolute left-0 mt-2 w-80 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#07111e]/95 backdrop-blur-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-2.5 z-50 focus:outline-none"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                        Institutional Architecture &amp; Governance
                      </p>
                    </div>

                    <div className="space-y-1">
                      {architectureLinks.map((item) => {
                        const isCurrent = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            className={`group flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                              isCurrent
                                ? "bg-cyan-500/10 dark:bg-cyan-500/15 text-[#157E92] dark:text-cyan-300 font-semibold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 text-[#157E92] dark:text-cyan-400 group-hover:bg-[#157E92] group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-[#07111E] transition-colors shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold leading-tight">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-1 mt-0.5">
                                {item.desc}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Consensus Heartbeat Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
                Consensus Active
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
              )}
            </button>

            {/* Session Actions or Portal Login Primary CTA */}
            {session ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 hover:bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-w-[130px] sm:max-w-[170px]"
                  title={session.email}
                >
                  <UserRound className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{session.email.split("@")[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out of session"
                  title="Sign out"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="group relative inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#10233F] to-[#157E92] hover:from-[#0d1d35] hover:to-[#11697a] dark:from-cyan-600 dark:to-teal-500 dark:hover:from-cyan-500 dark:hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-[0_0_16px_rgba(21,126,146,0.35)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <span>Portal Login</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Animated Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-navigation-drawer"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-slate-200/90 dark:border-slate-800 py-4 px-2 space-y-3 bg-white/95 dark:bg-[#07111e]/98 backdrop-blur-2xl rounded-b-2xl shadow-xl overflow-hidden"
            >
              <nav className="flex flex-col gap-1">
                <div className="px-3 py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Main Navigation
                  </span>
                </div>

                {primaryNavLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`min-h-[44px] px-3.5 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-between transition-colors ${
                        isActive
                          ? "text-[#157E92] bg-[#157E92]/10 dark:text-cyan-300 dark:bg-cyan-500/15"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#157E92] dark:text-cyan-400" />
                        <span>{link.label}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                    </Link>
                  );
                })}

                <div className="pt-2 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Architecture &amp; Governance
                  </span>
                </div>

                {architectureLinks.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center justify-between transition-colors ${
                        isActive
                          ? "text-[#157E92] bg-[#157E92]/10 dark:text-cyan-300 dark:bg-cyan-500/15"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{item.label}</span>
                      </span>
                      <ArrowRight className="w-3 h-3 opacity-30" />
                    </Link>
                  );
                })}

                <div className="pt-3 px-2 border-t border-slate-200 dark:border-slate-800 mt-2 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 py-1 px-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                      Consensus Protocol
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Online &amp; Auditable
                    </span>
                  </div>
                  {session ? (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200 text-xs font-semibold flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <UserRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <span className="truncate">{session.email}</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full py-2.5 px-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/90 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out of session</span>
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#10233F] to-[#157E92] hover:from-[#0d1d35] hover:to-[#11697a] text-white font-bold text-center text-sm shadow-md"
                    >
                      Portal Login
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
