"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <header className="apple-nav">
      <div className="apple-nav-inner">
        <div className="apple-nav-row">
          {/* Brand */}
          <Link
            href="/"
            className="apple-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3] rounded-md px-1 py-1 flex items-center gap-3"
          >
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden flex items-center justify-center bg-[#07111E] border border-cyan-500/40 shadow-sm shrink-0 p-0.5 hover:border-cyan-400 transition-colors">
              <Image
                src="/himvote-logo.svg"
                alt="HimVote Logo"
                className="w-full h-full object-contain"
                width={44}
                height={44}
                priority
              />
            </span>
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#10233F] dark:text-white">HimVote</span>
          </Link>

          {/* Desktop Nav */}
          <nav
            aria-label="Primary navigation"
            className="apple-nav-links"
          >
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`apple-nav-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3] ${
                    active
                      ? "apple-nav-link-active"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="apple-nav-actions">
            {/* Role Switcher Menu */}
            <div className="apple-role-switcher relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-expanded={roleMenuOpen}
                aria-haspopup="true"
                aria-label="Open navigation only workspace preview"
                className="apple-utility-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
              >
                <span className="hidden sm:inline">Role:</span>
                <span className="capitalize font-semibold text-[#0071e3]">
                  {currentRole}
                </span>
              </button>

              {roleMenuOpen && (
                <div
                  className="apple-popover z-50 text-sm origin-top-right animate-popover-spring"
                  role="menu"
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider border-b border-black/10 dark:border-white/10">
                    Navigation preview only
                  </div>
                    <p className="px-3 py-2 text-[11px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                    This menu changes navigation only. Server authentication and permissions still control every protected action.
                  </p>
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
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98] transition-all duration-75 ${
                          currentRole === item.role
                            ? "text-[#0071e3] font-bold bg-[#0071e3]/10"
                            : "text-[#1d1d1f] dark:text-[#f5f5f7]"
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
              className="apple-utility-button apple-icon-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
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
              className="apple-login hidden lg:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
            >
              Portal Login
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="apple-utility-button apple-icon-button md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
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
          <div className="apple-mobile-menu md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3 py-2 text-base font-medium rounded-xl text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-black/10 dark:border-white/10">
                <div className="px-3 py-2 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                  Navigation previews only
                </div>
                <p className="px-3 pb-2 text-[11px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                  Choosing a portal does not sign you in or grant access. Protected routes remain server-authorized.
                </p>
                {rolePortals.map((item) => (
                  <Link
                    key={item.role}
                    href={item.href}
                    onClick={() => {
                      setCurrentRole(item.role as any);
                      setMobileMenuOpen(false);
                    }}
                    className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl text-[#6e6e73] dark:text-[#a1a1a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="pt-4 px-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="apple-login w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
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
