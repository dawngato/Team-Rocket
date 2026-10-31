"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import type { SessionProfile } from "@/lib/identity_client";
import { identityClient } from "@/lib/identity_client";
import { CommandSearch } from "./CommandSearch";
import { MobileMenuButton } from "./WorkspaceSidebar";
import { workspaceHome } from "@/lib/routes/nav_config";
import { useApp } from "@/lib/query_provider";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";

interface WorkspaceHeaderProps {
  session: SessionProfile;
  onOpenMenu: () => void;
}

function resolveBreadcrumbs(pathname: string, roles: string[]): BreadcrumbItem[] {
  const home = workspaceHome(roles);
  const crumbs: BreadcrumbItem[] = [{ label: "Workspace", href: home }];

  // Student paths
  if (pathname.startsWith("/student/elections/")) {
    crumbs.push({ label: "My Elections", href: "/student/elections" });
    if (pathname.includes("/candidates")) crumbs.push({ label: "Candidates & Manifestos" });
    else if (pathname.includes("/credential")) crumbs.push({ label: "Blind Credential" });
    else if (pathname.includes("/cast")) crumbs.push({ label: "Cast Ballot" });
    else if (pathname.includes("/pending")) crumbs.push({ label: "Submission Pending" });
    else crumbs.push({ label: "Election Details" });
    return crumbs;
  }
  if (pathname.startsWith("/student/receipts/")) {
    crumbs.push({ label: "Receipts", href: "/student/receipts" });
    if (pathname.includes("/inclusion")) crumbs.push({ label: "Merkle Inclusion Proof" });
    else crumbs.push({ label: "Receipt Tracker" });
    return crumbs;
  }
  if (pathname === "/student/elections") {
    crumbs.push({ label: "My Elections" });
    return crumbs;
  }
  if (pathname === "/student/eligibility") {
    crumbs.push({ label: "Voting Eligibility" });
    return crumbs;
  }
  if (pathname === "/student/receipts") {
    crumbs.push({ label: "Receipt Verification" });
    return crumbs;
  }
  if (pathname === "/student/results") {
    crumbs.push({ label: "Published Results" });
    return crumbs;
  }
  if (pathname === "/student/help") {
    crumbs.push({ label: "Voter Help Guide" });
    return crumbs;
  }

  // Teacher paths
  if (pathname.startsWith("/teacher")) {
    crumbs.push({ label: "Faculty Teaching", href: "/teacher" });
    if (pathname === "/teacher/classes") crumbs.push({ label: "Enrolled Classes" });
    else if (pathname === "/teacher/verification-queue") crumbs.push({ label: "Student Verification" });
    else if (pathname === "/teacher/roster-corrections") crumbs.push({ label: "Roster Corrections" });
    else if (pathname === "/teacher/elections") crumbs.push({ label: "Authorized Elections" });
    return crumbs;
  }

  // Officer paths
  if (pathname.startsWith("/officer")) {
    crumbs.push({ label: "Election Operations", href: "/officer" });
    if (pathname === "/officer/create") crumbs.push({ label: "Election Builder" });
    else if (pathname === "/officer/elections") crumbs.push({ label: "Assigned Elections" });
    else if (pathname.includes("/candidates")) crumbs.push({ label: "Candidate Nominations" });
    else if (pathname.includes("/roster")) crumbs.push({ label: "Roster Snapshot" });
    else if (pathname.includes("/freeze")) crumbs.push({ label: "Manifest Freeze" });
    else if (pathname.includes("/lifecycle")) crumbs.push({ label: "Poll Controls" });
    else if (pathname.includes("/publication")) crumbs.push({ label: "Result Publication" });
    return crumbs;
  }

  // Administrator paths
  if (pathname.startsWith("/admin")) {
    crumbs.push({ label: "Administration", href: "/admin" });
    if (pathname === "/admin/candidates") crumbs.push({ label: "Candidates" });
    else if (pathname === "/admin/students") crumbs.push({ label: "Student Directory" });
    else if (pathname === "/admin/teachers") crumbs.push({ label: "Faculty Roster" });
    else if (pathname === "/admin/invitations") crumbs.push({ label: "Staff Invitations" });
    else if (pathname === "/admin/approvals") crumbs.push({ label: "Access Approvals" });
    else if (pathname === "/admin/assignments") crumbs.push({ label: "Officer Assignments" });
    else if (pathname === "/admin/roster-imports") crumbs.push({ label: "Import Student Records" });
    else if (pathname === "/admin/audit-logs") crumbs.push({ label: "Audit Logs" });
    return crumbs;
  }

  // Super Admin paths
  if (pathname.startsWith("/super-admin")) {
    crumbs.push({ label: "Governance", href: "/super-admin" });
    if (pathname === "/super-admin/institutions") crumbs.push({ label: "Institutions & Campuses" });
    else if (pathname === "/super-admin/departments") crumbs.push({ label: "Academic Departments" });
    else if (pathname === "/super-admin/administrators") crumbs.push({ label: "Administrators" });
    else if (pathname === "/super-admin/role-requests") crumbs.push({ label: "Elevated Role Requests" });
    else if (pathname === "/super-admin/policies") crumbs.push({ label: "Election Policies" });
    else if (pathname === "/super-admin/security") crumbs.push({ label: "Security & Keys" });
    else if (pathname === "/super-admin/system-audit") crumbs.push({ label: "System Audit Trail" });
    return crumbs;
  }

  // Auditor paths
  if (pathname.startsWith("/auditor")) {
    crumbs.push({ label: "Independent Auditor", href: "/auditor" });
    if (pathname === "/auditor/evidence") crumbs.push({ label: "Evidence Packages" });
    else if (pathname === "/auditor/witness") crumbs.push({ label: "Witness Co-Signatures" });
    else if (pathname === "/auditor/verify") crumbs.push({ label: "Offline Verification" });
    else if (pathname === "/auditor/sign") crumbs.push({ label: "Sign & Attest" });
    else if (pathname === "/auditor/chain") crumbs.push({ label: "Blockchain Anchor State" });
    else if (pathname === "/auditor/trusted-pins") crumbs.push({ label: "Pinned Public Keys" });
    return crumbs;
  }

  // Fallback title formatting
  const parts = pathname.split("/").filter(Boolean);
  const last = parts.at(-1) || "overview";
  const title = last.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  crumbs.push({ label: title });
  return crumbs;
}

export function WorkspaceHeader({ session, onOpenMenu }: WorkspaceHeaderProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { theme, toggleTheme } = useApp();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = resolveBreadcrumbs(pathname, session.roles);

  const helpHref = session.roles.some((role) => role.toLowerCase() === "student")
    ? "/student/help"
    : "/security-limits";

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("himvote_session_receipts");
        window.localStorage.removeItem("himvote_receipts");
      }
      await identityClient.logout();
    } finally {
      router.replace("/auth/login");
    }
  };

  const primaryRole = session.roles[0] || "User";

  return (
    <header className="sv-workspace-header">
      <div className="sv-header-left">
        <MobileMenuButton onClick={onOpenMenu} />
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="sv-header-actions">
        <CommandSearch roles={session.roles} />
        <Link href={helpHref} className="sv-header-icon" aria-label="Open voter help and security guide">
          <CircleHelp size={17} aria-hidden="true" />
        </Link>
        <span className="sv-header-divider" aria-hidden="true" />

        {/* Account Context Menu Dropdown */}
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            aria-expanded={accountMenuOpen}
            aria-haspopup="true"
            aria-label="Account context menu"
            className="sv-header-account flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <span className="sv-avatar sv-avatar-small font-bold">
              {session.email.slice(0, 1).toUpperCase()}
            </span>
            <div className="hidden text-left sm:block">
              <span className="sv-header-email block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                {session.email}
              </span>
              <span className="block text-[10px] text-slate-500 capitalize">
                {primaryRole}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
          </button>

          {accountMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-[#1E3352] dark:bg-[#132135] z-50 text-xs"
              role="menu"
              aria-orientation="vertical"
              aria-label="User account details"
            >
              <div className="border-b border-slate-100 p-3 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {session.email}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck size={13} aria-hidden="true" />
                  <span>Verified Session Active</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {session.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/account"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors"
                  role="menuitem"
                >
                  <UserRound size={15} aria-hidden="true" />
                  <span>Account Settings &amp; Security</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setAccountMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors text-left"
                  role="menuitem"
                >
                  {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
                  <span>Switch to {theme === "dark" ? "Light" : "Dark"} Appearance</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    void handleLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors text-left font-semibold"
                  role="menuitem"
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span>Sign Out of Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
