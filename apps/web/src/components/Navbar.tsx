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
  LogIn,
} from "lucide-react";
import { useApp } from "../lib/query_provider";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/elections", label: "Elections" },
    { href: "/how-it-works", label: "How Verification Works" },
    { href: "/results", label: "Published Results" },
    { href: "/audit", label: "Public Verification" },
    { href: "/security-limits", label: "Security Limits" },
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
                width={44}
                height={44}
                className="w-full h-full object-contain"
                priority
              />
            </span>
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#10233F] dark:text-white">
              HimVote
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="apple-nav-links" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`apple-nav-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0071e3] ${
                    isActive ? "apple-nav-link-active" : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="apple-nav-actions">
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
              className="apple-login hidden lg:flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
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
              <div className="pt-4 px-3 border-t border-black/10 dark:border-white/10">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="apple-login w-full flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
