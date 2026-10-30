"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Plus,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  ArrowLeft,
  Building2,
  FileText,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  type RichCandidate,
  getStoredCandidates,
  addCandidate,
  deleteCandidate,
  saveStoredCandidates,
  DEFAULT_CANDIDATES,
} from "@/lib/candidate_store";

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<RichCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [selectedElection, setSelectedElection] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New Candidate Form State
  const [name, setName] = useState("");
  const [position, setPosition] = useState("Student Union President");
  const [department, setDepartment] = useState("Computer Science & Engineering (4th Year)");
  const [rollNumber, setRollNumber] = useState("");
  const [slate, setSlate] = useState("Tech & Innovation Slate");
  const [contest, setContest] = useState("Student Union Council 2026");
  const [statement, setStatement] = useState("");
  const [manifestoInput, setManifestoInput] = useState("");
  const [avatarTheme, setAvatarTheme] = useState<"teal" | "rose" | "amber" | "green" | "blue">("teal");

  useEffect(() => {
    setCandidates(getStoredCandidates());

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ candidates: RichCandidate[] }>;
      if (custom.detail?.candidates) {
        setCandidates(custom.detail.candidates);
      }
    };
    window.addEventListener("himvote_candidates_updated", handleUpdate);
    return () => window.removeEventListener("himvote_candidates_updated", handleUpdate);
  }, []);

  const elections = useMemo(() => {
    const list = Array.from(new Set(candidates.map((c) => c.contest)));
    return list;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesElection = selectedElection === "ALL" || c.contest === selectedElection;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.roll_number.toLowerCase().includes(q) ||
        c.slate.toLowerCase().includes(q);
      return matchesElection && matchesSearch;
    });
  }, [candidates, selectedElection, search]);

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim()) {
      alert("Please enter candidate name and student roll number.");
      return;
    }

    const colorMap = {
      teal: "#0D9488",
      rose: "#E11D48",
      amber: "#D97706",
      green: "#15803D",
      blue: "#0284C7",
    };
    const chosenColor = colorMap[avatarTheme];

    const generatedSvg = `<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#F1F5F9"/>
      <circle cx="50" cy="38" r="20" fill="${chosenColor}"/>
      <circle cx="43" cy="36" r="3" fill="#FFFFFF"/>
      <circle cx="57" cy="36" r="3" fill="#FFFFFF"/>
      <path d="M 40 46 Q 50 52 60 46" stroke="#FFFFFF" stroke-width="2" fill="none"/>
      <path d="M 22 88 C 22 66 35 62 50 62 C 65 62 78 66 78 88 Z" fill="#0F172A"/>
      <polygon points="46,62 54,62 50,74" fill="${chosenColor}"/>
    </svg>`;

    const manifestoList = manifestoInput
      .split("\n")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const created = addCandidate({
      name: name.trim(),
      contest,
      election_id: contest.toLowerCase().includes("design") ? "demo_design_2026" : "demo_union_2026",
      position,
      department,
      roll_number: rollNumber.trim().toUpperCase(),
      slate,
      statement: statement.trim() || `Contesting for ${position} to serve the student body.`,
      manifesto_points: manifestoList.length > 0 ? manifestoList : [statement.trim()],
      avatar_svg: generatedSvg,
      status: "VERIFIED",
    });

    setCandidates((prev) => [...prev, created]);
    setShowAddModal(false);
    setSaveSuccess(`Candidate "${created.name}" registered successfully for ${created.position}!`);
    setTimeout(() => setSaveSuccess(null), 4000);

    // Reset Form
    setName("");
    setRollNumber("");
    setStatement("");
    setManifestoInput("");
  };

  const handleDelete = (id: string, candName: string) => {
    if (confirm(`Are you sure you want to remove ${candName} from the candidate roster?`)) {
      deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setSaveSuccess(`Removed "${candName}" from election roster.`);
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset candidates roster to official verified default contestants?")) {
      saveStoredCandidates(DEFAULT_CANDIDATES);
      setCandidates(DEFAULT_CANDIDATES);
      setSaveSuccess("Candidate roster reset to default verified contestants.");
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </Link>
        <button
          onClick={handleResetDefaults}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline"
        >
          Reset Default Contestants
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#1E3352] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-2">
            <Award className="w-4 h-4" />
            Nomination & Candidate Directory
          </div>
          <h1 className="text-3xl font-extrabold text-[#10233F] dark:text-white">
            Election Candidates Management
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            View, verify, and register real student contestants running for council elections with photos, departments, and manifestos.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#157E92] hover:bg-[#0E6273] text-white text-sm font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nominate / Add Contestant
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {saveSuccess}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-[#132135] p-4 rounded-xl border border-slate-200 dark:border-[#1E3352] shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by candidate name, roll number, department, or slate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Contest:</span>
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          >
            <option value="ALL">All Contests ({candidates.length})</option>
            {elections.map((elec) => (
              <option key={elec} value={elec}>
                {elec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.map((candidate) => (
          <article
            key={candidate.id}
            className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Header: Photo Avatar & Name */}
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#157E92] shrink-0 shadow-sm"
                  dangerouslySetInnerHTML={{
                    __html:
                      candidate.avatar_svg ||
                      `<div style="width:100%;height:100%;background:#E2E8F0;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#1E293B;">${candidate.name.charAt(
                        0
                      )}</div>`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {candidate.status || "VERIFIED"}
                    </span>
                    <button
                      onClick={() => handleDelete(candidate.id, candidate.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Remove candidate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-[#10233F] dark:text-white truncate mt-1">
                    {candidate.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
                    {candidate.position}
                  </p>
                </div>
              </div>

              {/* Department & Roll Number Tags */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-medium text-right">{candidate.department}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Roll Number:</span>
                  <span className="font-mono font-bold">{candidate.roll_number}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Slate / Party:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{candidate.slate}</span>
                </div>
              </div>

              {/* Manifesto Commitments */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Manifesto Pledges:
                </p>
                {candidate.manifesto_points && candidate.manifesto_points.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {candidate.manifesto_points.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{m}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    "{candidate.statement}"
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Footer: Contest Badge */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">{candidate.contest}</span>
              <span className="font-mono text-[10px] text-slate-500">
                ID: {candidate.id.substring(0, 10)}…
              </span>
            </div>
          </article>
        ))}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-[#1E3352] rounded-2xl">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#10233F] dark:text-white">
            No contestants found
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your search filter or click "Nominate / Add Contestant" above.
          </p>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#132135] rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 dark:border-[#1E3352] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-[#10233F] dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#157E92]" />
                Register Real Contestant
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Full Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Abhay Thakur / Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-[#157E92] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Position / Post *
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-[#157E92] outline-none"
                  >
                    <option value="Student Union President">President</option>
                    <option value="Vice-President">Vice-President</option>
                    <option value="General Secretary">General Secretary</option>
                    <option value="Cultural Secretary">Cultural Secretary</option>
                    <option value="Sports Secretary">Sports Secretary</option>
                    <option value="Academic Representative">Academic Representative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Roll Number *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 2023CSE1042"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-mono focus:ring-2 focus:ring-[#157E92] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department & Year *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Computer Science & Engineering (4th Year)"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-[#157E92] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slate / Party Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tech & Innovation Slate"
                    value={slate}
                    onChange={(e) => setSlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-[#157E92] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Election Contest
                  </label>
                  <select
                    value={contest}
                    onChange={(e) => setContest(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-[#157E92] outline-none"
                  >
                    <option value="Student Union Council 2026">Student Union Council 2026</option>
                    <option value="School of Design Representatives">School of Design Representatives</option>
                    <option value="Engineering Faculty Council">Engineering Faculty Council</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Avatar Portrait Color
                </label>
                <div className="flex gap-3">
                  {(["teal", "rose", "amber", "green", "blue"] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarTheme(color)}
                      className={`w-7 h-7 rounded-full border-2 capitalize text-[10px] ${
                        avatarTheme === color ? "ring-2 ring-offset-2 ring-slate-800" : ""
                      } ${
                        color === "teal"
                          ? "bg-teal-500"
                          : color === "rose"
                          ? "bg-rose-500"
                          : color === "amber"
                          ? "bg-amber-500"
                          : color === "green"
                          ? "bg-emerald-500"
                          : "bg-sky-500"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Key Manifesto Pledges (One pledge per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={`24/7 Library & High-Performance GPU access\nCampus shuttle automated live tracking\n100% budget transparency with open student ledger`}
                  value={manifestoInput}
                  onChange={(e) => setManifestoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-[#157E92] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#157E92] text-white font-bold text-sm hover:bg-[#0E6273] shadow-sm"
                >
                  Save Contestant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
