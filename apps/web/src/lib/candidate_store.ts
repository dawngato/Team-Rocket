"use client";

import type { Candidate } from "./types";

export interface RichCandidate extends Candidate {
  position: string;
  department: string;
  roll_number: string;
  slate: string;
  manifesto_points?: string[];
  election_id: string;
  avatar_svg?: string;
  status?: "VERIFIED" | "NOMINATED" | "PENDING";
}

const STORAGE_KEY = "himvote_admin_candidates";

export const DEFAULT_CANDIDATES: RichCandidate[] = [
  {
    id: "cand_aarav_sharma",
    election_id: "demo_union_2026",
    name: "Aarav Sharma",
    contest: "Student Union Council 2026",
    position: "Student Union President",
    department: "Computer Science & Engineering (4th Year)",
    roll_number: "2023CSE1042",
    slate: "Tech & Academic Innovation",
    status: "VERIFIED",
    statement: "Championing 24/7 library & AI GPU access, real-time campus shuttle tracking, and 100% transparent student council ledger.",
    manifesto_points: [
      "24/7 Library & High-Performance AI/GPU compute access for UG/PG students",
      "Automated real-time campus shuttle tracking and night-time electric scooter network",
      "100% budget transparency with open student council ledger"
    ],
    avatar_url: "/avatars/aarav.svg",
    avatar_svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#E0F2FE"/>
      <circle cx="50" cy="38" r="20" fill="#0D9488"/>
      <circle cx="43" cy="36" r="3" fill="#FFFFFF"/>
      <circle cx="57" cy="36" r="3" fill="#FFFFFF"/>
      <path d="M 40 46 Q 50 52 60 46" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M 38 33 L 48 33 M 52 33 L 62 33" stroke="#0F172A" stroke-width="2.5"/>
      <path d="M 22 88 C 22 66 35 62 50 62 C 65 62 78 66 78 88 Z" fill="#0F172A"/>
      <polygon points="46,62 54,62 52,78 48,78" fill="#38BDF8"/>
    </svg>`
  },
  {
    id: "cand_priya_patel",
    election_id: "demo_union_2026",
    name: "Priya Patel",
    contest: "Student Union Council 2026",
    position: "Vice-President",
    department: "Information Technology (3rd Year)",
    roll_number: "2024IT2088",
    slate: "Student Welfare & Equity",
    status: "VERIFIED",
    statement: "Dedicated to hostel mess reform with student-voted monthly menus, 24/7 mental wellness center, and transparent placement stats.",
    manifesto_points: [
      "Hostel mess committee revamp with student-voted weekly menus & hygiene audits",
      "Dedicated 24/7 mental wellness counseling center on campus",
      "Placement cell internship transparency & alumni mentorship network"
    ],
    avatar_url: "/avatars/priya.svg",
    avatar_svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FEE2E2"/>
      <circle cx="50" cy="38" r="20" fill="#E11D48"/>
      <circle cx="44" cy="36" r="2.5" fill="#FFFFFF"/>
      <circle cx="56" cy="36" r="2.5" fill="#FFFFFF"/>
      <path d="M 42 45 Q 50 50 58 45" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M 24 88 C 24 66 36 62 50 62 C 64 62 76 66 76 88 Z" fill="#4C1D95"/>
      <polygon points="45,62 55,62 50,74" fill="#F43F5E"/>
    </svg>`
  },
  {
    id: "cand_kabir_mehta",
    election_id: "demo_union_2026",
    name: "Kabir Mehta",
    contest: "Student Union Council 2026",
    position: "General Secretary",
    department: "Electronics & Communication Engg (4th Year)",
    roll_number: "2023ECE1015",
    slate: "Campus Unity & Transparency",
    status: "VERIFIED",
    statement: "Full public auditing of tech & cultural fest funds, sports arena renovation, and a one-click student grievance portal.",
    manifesto_points: [
      "Annual technical and cultural festival budget audited in public domain",
      "Sports equipment upgrade and gym facility expansion",
      "One-click grievance portal directly routed to Dean of Student Affairs"
    ],
    avatar_url: "/avatars/kabir.svg",
    avatar_svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#FEF3C7"/>
      <circle cx="50" cy="38" r="20" fill="#D97706"/>
      <circle cx="44" cy="36" r="3" fill="#FFFFFF"/>
      <circle cx="56" cy="36" r="3" fill="#FFFFFF"/>
      <path d="M 42 46 Q 50 50 58 46" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M 24 88 C 24 66 36 62 50 62 C 64 62 76 66 76 88 Z" fill="#1E293B"/>
      <polygon points="47,62 53,62 50,72" fill="#F59E0B"/>
    </svg>`
  },
  {
    id: "cand_ananya_iyer",
    election_id: "demo_union_2026",
    name: "Ananya Iyer",
    contest: "Student Union Council 2026",
    position: "Cultural & Environmental Secretary",
    department: "Civil & Environmental Engineering (3rd Year)",
    roll_number: "2024CIV1033",
    slate: "Eco-Campus & Creative Arts",
    status: "VERIFIED",
    statement: "Advancing zero-waste campus initiatives, solar charging stations, and dedicated incubation funding for student arts and clubs.",
    manifesto_points: [
      "Zero-waste campus initiative with solar charging benches across faculty lawns",
      "Inter-college cultural exchange program and student incubation club fund",
      "Free public bicycle sharing system across all departmental blocks"
    ],
    avatar_url: "/avatars/ananya.svg",
    avatar_svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#DCFCE7"/>
      <circle cx="50" cy="38" r="20" fill="#15803D"/>
      <circle cx="44" cy="36" r="2.5" fill="#FFFFFF"/>
      <circle cx="56" cy="36" r="2.5" fill="#FFFFFF"/>
      <path d="M 42 45 Q 50 50 58 45" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M 24 88 C 24 66 36 62 50 62 C 64 62 76 66 76 88 Z" fill="#064E3B"/>
      <polygon points="46,62 54,62 50,70" fill="#10B981"/>
    </svg>`
  },
  {
    id: "cand_marcus_vance",
    election_id: "demo_design_2026",
    name: "Marcus Vance",
    contest: "School of Design Representatives",
    position: "Design Representative Lead",
    department: "Industrial Design (4th Year)",
    roll_number: "2023DES1008",
    slate: "Studio Collective",
    status: "VERIFIED",
    statement: "Bridging industry design apprenticeships with annual undergraduate portfolio showcases and 24/7 rapid prototyping workshop access.",
    manifesto_points: [
      "24/7 access to 3D rapid prototyping lab, laser cutters, and VR suites",
      "Annual student design showcase connected with premier global tech studios",
      "Hardware material subsidies for capstone graduation projects"
    ],
    avatar_url: "/avatars/marcus.svg",
    avatar_svg: `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#E0F2FE"/>
      <circle cx="50" cy="38" r="20" fill="#0284C7"/>
      <circle cx="44" cy="36" r="3" fill="#FFFFFF"/>
      <circle cx="56" cy="36" r="3" fill="#FFFFFF"/>
      <path d="M 42 46 Q 50 50 58 46" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M 24 88 C 24 66 36 62 50 62 C 64 62 76 66 76 88 Z" fill="#0F172A"/>
    </svg>`
  }
];

export function getStoredCandidates(): RichCandidate[] {
  if (typeof window === "undefined") return DEFAULT_CANDIDATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CANDIDATES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CANDIDATES;
  } catch {
    return DEFAULT_CANDIDATES;
  }
}

export function saveStoredCandidates(candidates: RichCandidate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    window.dispatchEvent(new CustomEvent("himvote_candidates_updated", { detail: { candidates } }));
  } catch (err) {
    console.error("Failed to save candidates", err);
  }
}

export function addCandidate(candidate: Omit<RichCandidate, "id">): RichCandidate {
  const all = getStoredCandidates();
  const newCandidate: RichCandidate = {
    ...candidate,
    id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: candidate.status || "VERIFIED"
  };
  saveStoredCandidates([...all, newCandidate]);
  return newCandidate;
}

export function deleteCandidate(id: string): void {
  const all = getStoredCandidates();
  saveStoredCandidates(all.filter((c) => c.id !== id));
}
