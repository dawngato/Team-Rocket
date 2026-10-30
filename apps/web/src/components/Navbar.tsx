"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Vote,
  Sun,
  Moon,
  Menu,
  X,
  UserCheck,
  Shield,
  FileCheck,
  Award,
  GraduationCap,
  Users,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "../lib/query_provider";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, currentRole, setCurrentRole } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navLinks = [
    { href: "/elections", label: "Elections" },
    { href: "/how-it-works", label: "How Verification Works" },
    { href: "/results", label: "Results" },
    { href: "/audit", label: "Audit Explorer" },
    { href: "/security-limits", label: "Security Limits" },
  ];

  const rolePortals = [
    { role: "public", label: "Public Observer", href: "/", icon: Vote },
    { role: "student", label: "Student Portal", href: "/student", icon: GraduationCap },
    { role: "teacher", label: "Teacher Portal", href: "/teacher", icon: UserCheck },
    { role: "admin", label: "Administrator", href: "/admin", icon: Users },
    { role: "superadmin", label: "Super Administrator", href: "/super-admin", icon: ShieldAlert },
    { role: "officer", label: "Election Officer", href: "/officer/elections", icon: Award },
    { role: "auditor", label: "Independent Auditor", href: "/auditor", icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-[#1E3352] bg-white/95 dark:bg-[#10233F]/95 backdrop-blur-md transition-colors">
      <div className="w-full max-w-[1800px] mx-auto px-[clamp(1.25rem,4vw,5rem)]">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-xl text-[#10233F] dark:text-white tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] rounded-md px-1 py-1"
          >
            <span className="w-8 h-8 rounded-lg bg-[#157E92] flex items-center justify-center text-white shadow-sm">
              <Vote className="w-5 h-5" aria-hidden="true" />
            </span>
            <span>HimVote</span>
          </Link>

          {/* Desktop Nav */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center space-x-1 lg:space-x-4"
          >
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] ${
                    active
                      ? "text-[#157E92] dark:text-[#38BDF8] font-semibold bg-[#157E92]/5 dark:bg-[#157E92]/15"
                      : "text-slate-700 dark:text-slate-300 hover:text-[#157E92] dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-expanded={roleMenuOpen}
                aria-haspopup="true"
                aria-label="Switch Role Workspace"
                className="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 dark:border-[#1E3352] text-[#10233F] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-75 ease-out flex items-center gap-1.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10233F]"
              >
                <span className="hidden sm:inline">Role:</span>
                <span className="capitalize font-semibold text-[#157E92] dark:text-[#38BDF8]">
                  {currentRole}
                </span>
              </button>

              {roleMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-xl py-2 z-50 text-sm origin-top-right animate-popover-spring"
                  role="menu"
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Switch Active Flow
                  </div>
                  {rolePortals.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.role}
                        href={item.href}
                        onClick={() => {
                          setCurrentRole(item.role as any);
                          setRoleMenuOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-75 ${
                          currentRole === item.role
                            ? "text-[#157E92] dark:text-[#38BDF8] font-bold bg-[#157E92]/10"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                        role="menuitem"
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-75 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10233F]"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Moon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            {/* Auth Sign In Link */}
            <Link
              href="/auth/login"
              className="hidden lg:flex min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] rounded-lg items-center justify-center transition-all duration-75 ease-out shadow-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10233F]"
            >
              Portal Login
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-75 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#10233F]"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-[#1E3352]">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3 py-2 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-200 dark:border-[#1E3352]">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Role Portals
                </div>
                {rolePortals.map((item) => (
                  <Link
                    key={item.role}
                    href={item.href}
                    onClick={() => {
                      setCurrentRole(item.role as any);
                      setMobileMenuOpen(false);
                    }}
                    className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="pt-4 px-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] px-4 py-2 text-center text-sm font-semibold text-white bg-[#157E92] hover:bg-[#0E6273] active:scale-[0.98] rounded-lg flex items-center justify-center transition-all duration-75 ease-out shadow-sm select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92]"
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
