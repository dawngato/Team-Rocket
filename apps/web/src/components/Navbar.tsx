"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  ArrowRight,
  Radio,
} from "lucide-react";
import { useApp } from "../lib/query_provider";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/elections", label: "Elections" },
    { href: "/how-it-works", label: "How Verification Works" },
    { href: "/results", label: "Results" },
    { href: "/audit", label: "Audit Explorer" },
    { href: "/security-limits", label: "Security Architecture" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#07111e]/90 transition-colors">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="flex items-center justify-between min-h-[68px] gap-4">
          {/* Brand Logo & Institutional Tag */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group rounded-xl py-1 px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden flex items-center justify-center bg-[#07111E] border border-cyan-500/40 shadow-sm group-hover:border-cyan-400 group-hover:shadow-cyan-500/20 transition-all p-0.5 shrink-0">
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
            className="hidden md:flex items-center gap-1.5 lg:gap-2.5"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    isActive
                      ? "text-[#157E92] bg-[#157E92]/10 dark:text-cyan-300 dark:bg-cyan-500/15 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
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
                Network Online
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

            {/* Portal Login Primary CTA */}
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#10233F] to-[#157E92] hover:from-[#0d1d35] hover:to-[#11697a] dark:from-cyan-600 dark:to-teal-500 dark:hover:from-cyan-500 dark:hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <span>Portal Login</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
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

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/90 dark:border-slate-800 py-4 px-2 space-y-1 bg-white/95 dark:bg-[#07111e]/98 backdrop-blur-2xl rounded-b-2xl animate-fade-in shadow-xl">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-between transition-colors ${
                      isActive
                        ? "text-[#157E92] bg-[#157E92]/10 dark:text-cyan-300 dark:bg-cyan-500/15"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                  </Link>
                );
              })}
              <div className="pt-3 px-2 border-t border-slate-200 dark:border-slate-800 mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 py-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                    Consensus Engine
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Active &amp; Verified</span>
                </div>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#10233F] to-[#157E92] text-white font-bold text-center text-sm shadow-md"
                >
                  Portal Login
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
