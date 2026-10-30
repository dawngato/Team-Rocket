import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BookOpenCheck,
  CheckSquare,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  GraduationCap,
  KeyRound,
  Landmark,
  ListChecks,
  SearchCheck,
  Settings2,
  ShieldCheck,
  Users,
  Vote,
} from "lucide-react";

export type WorkspaceRole = "student" | "teacher" | "election_officer" | "administrator" | "super_admin" | "auditor";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: WorkspaceRole[];
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const workspaceNav: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/student", icon: Gauge, roles: ["student"], keywords: "home overview dashboard" },
      { label: "Elections", href: "/student/elections", icon: Vote, roles: ["student"], keywords: "elections contests voting" },
      { label: "Receipts", href: "/student/receipts", icon: FileCheck2, roles: ["student"], keywords: "receipt inclusion proof" },
    ],
  },
  {
    label: "Student",
    items: [
      { label: "My eligibility", href: "/student/elections", icon: Fingerprint, roles: ["student"], keywords: "eligibility roster credential" },
      { label: "Published results", href: "/student/results", icon: ListChecks, roles: ["student"], keywords: "results tally" },
      { label: "Student help", href: "/student/help", icon: BookOpenCheck, roles: ["student"], keywords: "support help" },
    ],
  },
  {
    label: "Teaching",
    items: [
      { label: "Faculty overview", href: "/teacher", icon: GraduationCap, roles: ["teacher"], keywords: "teacher classes" },
      { label: "My classes", href: "/teacher/classes", icon: Users, roles: ["teacher"], keywords: "classes students" },
      { label: "Verification queue", href: "/teacher/verification-queue", icon: CheckSquare, roles: ["teacher"], keywords: "verify roster" },
      { label: "Roster corrections", href: "/teacher/roster-corrections", icon: ClipboardCheck, roles: ["teacher"], keywords: "correction request" },
    ],
  },
  {
    label: "Election operations",
    items: [
      { label: "Officer overview", href: "/officer", icon: Activity, roles: ["election_officer"], keywords: "officer operations" },
      { label: "Election builder", href: "/officer/create", icon: FileText, roles: ["election_officer"], keywords: "create election draft" },
      { label: "Assigned elections", href: "/officer/elections", icon: Vote, roles: ["election_officer"], keywords: "manage elections" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin overview", href: "/admin", icon: ShieldCheck, roles: ["administrator", "super_admin"], keywords: "admin" },
      { label: "Students", href: "/admin/students", icon: Users, roles: ["administrator", "super_admin"], keywords: "student directory" },
      { label: "Approvals", href: "/admin/approvals", icon: CheckSquare, roles: ["administrator", "super_admin"], keywords: "role approvals" },
      { label: "Roster imports", href: "/admin/roster-imports", icon: Archive, roles: ["administrator", "super_admin"], keywords: "csv import" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Institutions", href: "/super-admin/institutions", icon: Landmark, roles: ["super_admin"], keywords: "institution tenant" },
      { label: "Role requests", href: "/super-admin/role-requests", icon: KeyRound, roles: ["super_admin"], keywords: "grants governance" },
      { label: "Security policies", href: "/super-admin/security", icon: Settings2, roles: ["super_admin"], keywords: "security policy" },
    ],
  },
  {
    label: "Independent review",
    items: [
      { label: "Auditor overview", href: "/auditor", icon: SearchCheck, roles: ["auditor"], keywords: "audit evidence" },
      { label: "Evidence", href: "/auditor/evidence", icon: Archive, roles: ["auditor"], keywords: "archive evidence" },
      { label: "Verify", href: "/auditor/verify", icon: ShieldCheck, roles: ["auditor"], keywords: "verification proof" },
      { label: "Trusted pins", href: "/auditor/trusted-pins", icon: KeyRound, roles: ["auditor"], keywords: "keys trust anchors" },
    ],
  },
];

export const publicNav = [
  { label: "Elections", href: "/elections" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Results", href: "/results" },
  { label: "Verify", href: "/audit" },
  { label: "Security limits", href: "/security-limits" },
];

export function normalizeRole(role: string): WorkspaceRole | null {
  const normalized = role.trim().toLowerCase();
  if (normalized === "officer") return "election_officer";
  if (normalized === "admin") return "administrator";
  if (normalized === "superadmin") return "super_admin";
  return ["student", "teacher", "election_officer", "administrator", "super_admin", "auditor"].includes(normalized)
    ? normalized as WorkspaceRole
    : null;
}

export function canSeeItem(item: NavItem, roles: string[]): boolean {
  if (!item.roles?.length) return true;
  const normalized = roles.map(normalizeRole).filter((role): role is WorkspaceRole => Boolean(role));
  return item.roles.some((role) => normalized.includes(role));
}

export function visibleWorkspaceNav(roles: string[]): NavGroup[] {
  return workspaceNav
    .map((group) => ({ ...group, items: group.items.filter((item) => canSeeItem(item, roles)) }))
    .filter((group) => group.items.length > 0);
}

export function workspaceHome(roles: string[]): string {
  const normalized = roles.map(normalizeRole).filter((role): role is WorkspaceRole => Boolean(role));
  if (normalized.includes("super_admin")) return "/super-admin";
  if (normalized.includes("administrator")) return "/admin";
  if (normalized.includes("election_officer")) return "/officer";
  if (normalized.includes("teacher")) return "/teacher";
  if (normalized.includes("auditor")) return "/auditor";
  return "/student";
}

export function canAccessWorkspaceRoute(pathname: string, roles: string[]): boolean {
  const normalized = roles.map(normalizeRole).filter((role): role is WorkspaceRole => Boolean(role));
  const routeRoles: Array<[string, WorkspaceRole[]]> = [
    ["/student", ["student"]],
    ["/teacher", ["teacher"]],
    ["/officer", ["election_officer"]],
    ["/admin", ["administrator", "super_admin"]],
    ["/super-admin", ["super_admin"]],
    ["/auditor", ["auditor"]],
  ];
  const match = routeRoles.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1].some((role) => normalized.includes(role)) : false;
}
