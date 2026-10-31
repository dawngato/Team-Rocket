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
  UserRound,
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
      { label: "My elections", href: "/student/elections", icon: Vote, roles: ["student"], keywords: "elections contests voting" },
      { label: "Receipts", href: "/student/receipts", icon: FileCheck2, roles: ["student"], keywords: "receipt inclusion proof" },
    ],
  },
  {
    label: "Student",
    items: [
      { label: "My eligibility", href: "/student/eligibility", icon: Fingerprint, roles: ["student"], keywords: "eligibility roster credential" },
      { label: "Published results", href: "/student/results", icon: ListChecks, roles: ["student"], keywords: "results tally" },
      { label: "Student help", href: "/student/help", icon: BookOpenCheck, roles: ["student"], keywords: "support help" },
    ],
  },
  {
    label: "Teaching",
    items: [
      { label: "Overview", href: "/teacher", icon: GraduationCap, roles: ["teacher"], keywords: "teacher classes" },
      { label: "My classes", href: "/teacher/classes", icon: Users, roles: ["teacher"], keywords: "classes students" },
      { label: "Student verification", href: "/teacher/verification-queue", icon: CheckSquare, roles: ["teacher"], keywords: "verify roster" },
      { label: "Roster corrections", href: "/teacher/roster-corrections", icon: ClipboardCheck, roles: ["teacher"], keywords: "correction request" },
      { label: "Authorized elections", href: "/teacher/elections", icon: Vote, roles: ["teacher"], keywords: "assigned elections" },
    ],
  },
  {
    label: "Election operations",
    items: [
      { label: "Overview", href: "/officer", icon: Activity, roles: ["election_officer"], keywords: "officer operations" },
      { label: "Assigned elections", href: "/officer/elections", icon: Vote, roles: ["election_officer"], keywords: "manage elections" },
      { label: "Election builder", href: "/officer/create", icon: FileText, roles: ["election_officer"], keywords: "create election draft" },
      { label: "Candidates", href: "/officer/elections", icon: ListChecks, roles: ["election_officer"], keywords: "candidate nominations" },
      { label: "Roster review", href: "/officer/elections", icon: Users, roles: ["election_officer"], keywords: "roster review" },
      { label: "Election controls", href: "/officer/elections", icon: Settings2, roles: ["election_officer"], keywords: "open close publish" },
      { label: "Operational audit", href: "/officer/elections", icon: FileText, roles: ["election_officer"], keywords: "audit history" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Overview", href: "/admin", icon: ShieldCheck, roles: ["administrator", "super_admin"], keywords: "admin" },
      { label: "Students", href: "/admin/students", icon: Users, roles: ["administrator", "super_admin"], keywords: "student directory" },
      { label: "Staff and invitations", href: "/admin/invitations", icon: UserRound, roles: ["administrator", "super_admin"], keywords: "teachers staff invitation" },
      { label: "Approvals", href: "/admin/approvals", icon: CheckSquare, roles: ["administrator", "super_admin"], keywords: "role approvals" },
      { label: "Roster imports", href: "/admin/roster-imports", icon: Archive, roles: ["administrator", "super_admin"], keywords: "csv import" },
      { label: "Audit logs", href: "/admin/audit-logs", icon: FileText, roles: ["administrator", "super_admin"], keywords: "audit events" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Institutions", href: "/super-admin/institutions", icon: Landmark, roles: ["super_admin"], keywords: "institution tenant" },
      { label: "Administrator access", href: "/super-admin/role-requests", icon: KeyRound, roles: ["super_admin"], keywords: "grants governance" },
      { label: "Policies", href: "/super-admin/policies", icon: Settings2, roles: ["super_admin"], keywords: "policy" },
      { label: "Security oversight", href: "/super-admin/security", icon: ShieldCheck, roles: ["super_admin"], keywords: "security audit" },
    ],
  },
  {
    label: "Independent review",
    items: [
      { label: "Auditor overview", href: "/auditor", icon: SearchCheck, roles: ["auditor"], keywords: "audit evidence" },
      { label: "Evidence", href: "/auditor/evidence", icon: Archive, roles: ["auditor"], keywords: "archive evidence" },
      { label: "Trusted keys", href: "/auditor/trusted-pins", icon: KeyRound, roles: ["auditor"], keywords: "keys trust anchors" },
      { label: "Checkpoints", href: "/auditor/witness", icon: Activity, roles: ["auditor"], keywords: "witness checkpoints" },
      { label: "Verify results", href: "/auditor/verify", icon: ShieldCheck, roles: ["auditor"], keywords: "verification proof results" },
      { label: "Findings and reports", href: "/auditor/evidence", icon: FileText, roles: ["auditor"], keywords: "findings reports" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Account settings", href: "/account", icon: UserRound, roles: ["student", "teacher", "election_officer", "administrator", "super_admin", "auditor"], keywords: "profile session account" },
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
    ["/account", ["student", "teacher", "election_officer", "administrator", "super_admin", "auditor"]],
  ];
  const match = routeRoles.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1].some((role) => normalized.includes(role)) : false;
}
