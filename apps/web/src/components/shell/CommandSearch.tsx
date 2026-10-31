"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Command, FileText, Search, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { canSeeItem, type NavItem, visibleWorkspaceNav } from "@/lib/routes/nav_config";
import { electionClient } from "@/lib/election_client";
import type { Election } from "@/lib/types";

interface SearchEntry {
  id: string;
  category: "Pages" | "Elections" | "Evidence";
  label: string;
  sublabel?: string;
  href: string;
  icon: typeof Search;
  keywords?: string;
}

export function CommandSearch({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [elections, setElections] = useState<Election[]>([]);
  const [isMac, setIsMac] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
    }
  }, []);

  // Fetch permitted elections when search dialog is opened
  useEffect(() => {
    if (!open) return;
    let active = true;
    void electionClient
      .getElections()
      .then((list) => {
        if (active) setElections(list);
      })
      .catch(() => {
        if (active) setElections([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Build searchable corpus from navigation + permitted elections
  const allEntries: SearchEntry[] = useMemo(() => {
    const navEntries: SearchEntry[] = visibleWorkspaceNav(roles)
      .flatMap((group) => group.items)
      .map((item) => ({
        id: `page_${item.href}`,
        category: "Pages" as const,
        label: item.label,
        sublabel: "Workspace view",
        href: item.href,
        icon: item.icon as typeof Search,
        keywords: item.keywords,
      }));

    const isStudent = roles.some((r) => r.toLowerCase() === "student");
    const electionEntries: SearchEntry[] = elections.map((e) => ({
      id: `elec_${e.id}`,
      category: "Elections" as const,
      label: e.title,
      sublabel: `${e.state} · ${e.contest || "Contest"}`,
      href: isStudent ? `/student/elections/${encodeURIComponent(e.id)}` : `/officer/elections`,
      icon: Vote,
      keywords: `${e.id} ${e.contest} election`,
    }));

    const evidenceEntries: SearchEntry[] = [
      {
        id: "evid_audit",
        category: "Evidence" as const,
        label: "Public Verifier Evidence & Anchor Logs",
        sublabel: "RFC 9162 witness proofs",
        href: "/audit",
        icon: FileText,
        keywords: "merkle witness blockchain anchor proof",
      },
    ];

    return [...navEntries, ...electionEntries, ...evidenceEntries];
  }, [roles, elections]);

  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return allEntries.slice(0, 10);
    return allEntries
      .filter((entry) => `${entry.label} ${entry.sublabel || ""} ${entry.keywords || ""}`.toLowerCase().includes(value))
      .slice(0, 10);
  }, [allEntries, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keydown for shortcut and dialog navigation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (matches.length > 0 ? (prev + 1) % matches.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (matches.length > 0 ? (prev - 1 + matches.length) % matches.length : 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (matches[selectedIndex]) {
          navigate(matches[selectedIndex]);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, matches, selectedIndex]);

  // Focus management
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!open || !resultsRef.current) return;
    const activeEl = resultsRef.current.querySelector<HTMLElement>('[data-active="true"]');
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, open]);

  const navigate = (entry: SearchEntry) => {
    setOpen(false);
    router.push(entry.href);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="sv-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open workspace search"
      >
        <Search size={15} aria-hidden="true" />
        <span>Search workspace</span>
        <kbd className="inline-flex items-center gap-0.5 font-mono text-[10px]">
          {isMac ? <Command size={11} aria-hidden="true" /> : "Ctrl+"}K
        </kbd>
      </button>

      {open && (
        <div
          className="sv-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="sv-command-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-search-heading"
          >
            <div className="sv-command-input-row">
              <Search size={18} className="text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to a page, election, or verification evidence..."
                aria-label="Search authorized workspace destinations"
                aria-controls="command-search-results"
                aria-activedescendant={matches[selectedIndex] ? matches[selectedIndex].id : undefined}
              />
              <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700">
                Esc
              </kbd>
            </div>

            <h2 id="workspace-search-heading" className="sr-only">
              Workspace search and navigation
            </h2>

            <div
              id="command-search-results"
              ref={resultsRef}
              className="sv-command-results max-h-80 overflow-y-auto p-2"
              role="listbox"
              aria-label="Search results"
            >
              {matches.length > 0 ? (
                matches.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      id={item.id}
                      role="option"
                      aria-selected={isSelected}
                      data-active={isSelected ? "true" : "false"}
                      onClick={() => navigate(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors ${
                        isSelected
                          ? "bg-[#157E92]/10 text-[#157E92] font-semibold dark:bg-[#38BDF8]/10 dark:text-[#38BDF8]"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Icon size={14} aria-hidden="true" />
                        </span>
                        <div className="truncate text-left">
                          <span className="block truncate text-xs">{item.label}</span>
                          {item.sublabel && (
                            <span className="block truncate text-[10px] text-slate-400 font-normal">
                              {item.category} · {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={13} className="shrink-0 text-slate-400 ml-2" aria-hidden="true" />
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No authorized destination or election matches &ldquo;{query}&rdquo;.
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 flex items-center justify-between">
              <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
              <span className="font-mono text-[10px]">Permission Scoped</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
