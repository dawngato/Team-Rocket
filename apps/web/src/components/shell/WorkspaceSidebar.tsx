"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { SessionProfile } from "@/lib/identity_client";
import { visibleWorkspaceNav, workspaceHome } from "@/lib/routes/nav_config";
import { useApp } from "@/lib/query_provider";

interface WorkspaceSidebarProps {
  session: SessionProfile;
  mobileOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function WorkspaceSidebar({
  session,
  mobileOpen,
  onClose,
  onLogout,
}: WorkspaceSidebarProps) {
  const pathname = usePathname() ?? "/";
  const { theme, toggleTheme } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Restore collapsed state from localStorage (prevent collapse during casting)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("himvote_sidebar_collapsed");
        if (saved === "true" && !pathname.includes("/cast")) {
          setCollapsed(true);
        }
      } catch {}
    }
  }, [pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("himvote_sidebar_collapsed", String(next));
      } catch {}
    }
  };

  // Mobile drawer focus trap and Escape handler
  useEffect(() => {
    if (!mobileOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab" && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onClose]);

  const roleLabels = session.roles
    .map((role) => role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(", ");

  const navGroups = visibleWorkspaceNav(session.roles);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sv-sidebar-scrim fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-label="Close navigation backdrop"
        />
      )}

      <aside
        ref={sidebarRef}
        aria-label="Authorized workspace navigation"
        className={`sv-sidebar transition-all duration-200 ${mobileOpen ? "is-open" : ""} ${
          collapsed ? "is-collapsed w-16" : "w-64"
        }`}
      >
        <div className="sv-sidebar-brand flex items-center justify-between p-4 border-b border-slate-200/80 dark:border-[#1E3352]">
          <Link
            href={workspaceHome(session.roles)}
            className="sv-brand-mark flex items-center gap-2.5 truncate"
            onClick={onClose}
            aria-label="HimVote workspace home"
          >
            <span className="sv-brand-symbol flex size-8 shrink-0 items-center justify-center rounded-xl text-white">
              <ShieldCheck size={17} aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="truncate">
                <strong className="block text-sm font-bold text-[#1E3A5F] dark:text-white leading-tight">
                  HimVote
                </strong>
                <small className="block text-[10px] text-slate-500 font-medium">
                  Verified Workspace
                </small>
              </span>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Mobile close button */}
          <button
            ref={closeButtonRef}
            type="button"
            className="sv-icon-button sv-mobile-close lg:hidden"
            onClick={onClose}
            aria-label="Close mobile navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* User Identity Chip */}
        {!collapsed ? (
          <div className="sv-workspace-chip m-3 flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-[#1E3A5F]/30 border border-slate-100 dark:border-slate-800/60">
            <span className="sv-avatar flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#2459A6]/20 text-[#2459A6] font-bold text-xs dark:text-[#60A5FA]">
              {session.email.slice(0, 1).toUpperCase()}
            </span>
            <span className="sv-workspace-copy truncate text-left">
              <strong className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                Institutional Workspace
              </strong>
              <small className="block truncate text-[10px] text-slate-500" title={roleLabels}>
                {roleLabels || "Member"}
              </small>
            </span>
            <span className="sv-online-dot size-2 rounded-full bg-emerald-500 ml-auto shrink-0" title="Active session" />
          </div>
        ) : (
          <div className="flex justify-center py-3">
            <span
              className="sv-avatar flex size-7 items-center justify-center rounded-lg bg-[#2459A6]/20 text-[#2459A6] font-bold text-xs dark:text-[#60A5FA]"
              title={session.email}
            >
              {session.email.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="sv-sidebar-nav flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {navGroups.map((group) => (
            <section key={group.label} className="sv-nav-group space-y-1">
              {!collapsed && (
                <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h2>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/student" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`sv-nav-link flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "is-active bg-[#2459A6]/10 text-[#2459A6] font-semibold dark:bg-[#60A5FA]/10 dark:text-[#60A5FA]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon size={16} className="shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="sv-sidebar-footer border-t border-slate-200/80 p-2 dark:border-[#1E3352] space-y-1">
          <Link
            href="/security-limits"
            onClick={onClose}
            title={collapsed ? "Security limits" : undefined}
            className={`sv-nav-link flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>Security limits</span>}
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            title={collapsed ? (theme === "dark" ? "Light appearance" : "Dark appearance") : undefined}
            className={`sv-nav-link flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            {theme === "dark" ? (
              <Sun size={16} className="shrink-0 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon size={16} className="shrink-0 text-slate-600" aria-hidden="true" />
            )}
            {!collapsed && <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? "Sign out" : undefined}
            className={`sv-nav-link sv-logout flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut size={16} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="sv-icon-button sv-mobile-menu flex size-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#1E3352] text-slate-700 dark:text-slate-200 lg:hidden"
      onClick={onClick}
      aria-label="Open mobile navigation"
    >
      <Menu size={18} aria-hidden="true" />
    </button>
  );
}
