"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Command, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { canSeeItem, type NavItem, visibleWorkspaceNav } from "@/lib/routes/nav_config";

export function CommandSearch({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => visibleWorkspaceNav(roles).flatMap((group) => group.items), [roles]);
  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items.slice(0, 8);
    return items.filter((item) => `${item.label} ${item.keywords || ""}`.toLowerCase().includes(value)).slice(0, 8);
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const go = (item: NavItem) => {
    if (!canSeeItem(item, roles)) return;
    setOpen(false);
    router.push(item.href);
  };

  return (
    <>
      <button type="button" className="sv-search-trigger" onClick={() => setOpen(true)} aria-label="Open workspace search">
        <Search size={16} aria-hidden="true" />
        <span>Search workspace</span>
        <kbd><Command size={12} aria-hidden="true" />K</kbd>
      </button>
      {open && (
        <div className="sv-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="sv-command-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-search-title">
            <div className="sv-command-input-row">
              <Search size={18} aria-hidden="true" />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jump to an authorized workspace" aria-label="Search authorized workspace destinations" />
              <kbd>Esc</kbd>
            </div>
            <h2 id="workspace-search-title" className="sr-only">Workspace search</h2>
            <div className="sv-command-results" role="listbox" aria-label="Authorized destinations">
              {matches.length > 0 ? matches.map((item) => {
                const Icon = item.icon;
                return <button key={item.href} type="button" className="sv-command-item" onClick={() => go(item)} role="option"><span className="sv-command-icon"><Icon size={16} aria-hidden="true" /></span><span>{item.label}</span><ArrowRight className="ml-auto" size={14} aria-hidden="true" /></button>;
              }) : <p className="sv-command-empty">No authorized destination matches that search.</p>}
            </div>
            <p className="sv-command-help">Navigation is filtered from server-returned session roles. Resource authorization is enforced again by each API.</p>
          </section>
        </div>
      )}
    </>
  );
}
