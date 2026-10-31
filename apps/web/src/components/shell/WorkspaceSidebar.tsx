"use client";

import Link from "next/link";
import { LogOut, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import { usePathname } from "next/navigation";
import type { SessionProfile } from "@/lib/identity_client";
import { visibleWorkspaceNav, workspaceHome } from "@/lib/routes/nav_config";
import { useApp } from "@/lib/query_provider";

export function WorkspaceSidebar({ session, mobileOpen, onClose, onLogout }: { session: SessionProfile; mobileOpen: boolean; onClose: () => void; onLogout: () => void }) {
  const pathname = usePathname() ?? "/";
  const { theme, toggleTheme } = useApp();
  const homeUrl = workspaceHome(session.roles);

  return <><>{mobileOpen && <button type="button" className="sv-sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}</><aside className={`sv-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Authorized workspace navigation">
    <div className="sv-sidebar-brand"><Link href={homeUrl} className="sv-brand-mark" onClick={onClose} aria-label="HimVote workspace home"><span className="sv-brand-symbol"><ShieldCheck size={17} aria-hidden="true" /></span><span><strong>HimVote</strong><small>Secure campus elections</small></span></Link><button type="button" className="sv-icon-button sv-mobile-close" onClick={onClose} aria-label="Close navigation"><X size={18} aria-hidden="true" /></button></div>
    <div className="sv-workspace-chip"><span className="sv-avatar">{session.email.slice(0, 1).toUpperCase()}</span><span className="sv-workspace-copy"><strong>HPTU workspace</strong><small>{session.roles[0]?.replaceAll("_", " ") || "member"}</small></span><span className="sv-online-dot" title="Session active" /></div>
    <nav className="sv-sidebar-nav">{visibleWorkspaceNav(session.roles, session.scopes).map((group) => <section key={group.label} className="sv-nav-group"><h2>{group.label}</h2>{group.items.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} onClick={onClose} className={`sv-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={16} aria-hidden="true" /><span>{item.label}</span></Link>; })}</section>)}</nav>
    <div className="sv-sidebar-footer"><Link href="/security-limits" className="sv-nav-link" onClick={onClose}><ShieldCheck size={16} aria-hidden="true" /><span>Security limits</span></Link><button type="button" className="sv-nav-link" onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}<span>{theme === "dark" ? "Light appearance" : "Dark appearance"}</span></button><button type="button" className="sv-nav-link sv-logout" onClick={onLogout}><LogOut size={16} aria-hidden="true" /><span>Sign out</span></button></div>
  </aside></>;
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) { return <button type="button" className="sv-icon-button sv-mobile-menu" onClick={onClick} aria-label="Open navigation"><Menu size={19} aria-hidden="true" /></button>; }
