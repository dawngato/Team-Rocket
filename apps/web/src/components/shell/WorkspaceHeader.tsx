"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, CircleHelp, ShieldCheck } from "lucide-react";
import type { SessionProfile } from "@/lib/identity_client";
import { CommandSearch } from "./CommandSearch";
import { MobileMenuButton } from "./WorkspaceSidebar";
import { workspaceHome } from "@/lib/routes/nav_config";

interface WorkspaceHeaderProps {
  session: SessionProfile;
  onOpenMenu: () => void;
}

function titleForPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts.at(-1) || "overview";
  return last.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function WorkspaceHeader({ session, onOpenMenu }: WorkspaceHeaderProps) {
  const pathname = usePathname() ?? "/";
  const homeHref = workspaceHome(session.roles);
  const helpHref = session.roles.some((role) => role.toLowerCase() === "student") ? "/student/help" : "/security-limits";
  return (
    <header className="sv-workspace-header">
      <div className="sv-header-left">
        <MobileMenuButton onClick={onOpenMenu} />
        <div className="sv-breadcrumbs" aria-label="Breadcrumb">
          <Link href={homeHref}>Workspace</Link><ChevronRight size={14} aria-hidden="true" /><span>{titleForPath(pathname)}</span>
        </div>
      </div>
      <div className="sv-header-actions">
        <CommandSearch roles={session.roles} />
        <Link href={helpHref} className="sv-header-icon" aria-label="Open help"><CircleHelp size={17} aria-hidden="true" /></Link>
        <span className="sv-header-divider" aria-hidden="true" />
        <span className="sv-header-account" title={session.email}><span className="sv-avatar sv-avatar-small">{session.email.slice(0, 1).toUpperCase()}</span><span className="sv-header-email">{session.email}</span></span>
        <span className="sv-session-label"><ShieldCheck size={13} aria-hidden="true" /> Session active</span>
      </div>
    </header>
  );
}
