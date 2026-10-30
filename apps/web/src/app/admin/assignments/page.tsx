"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, UserCheck, Plus, CheckCircle2, ArrowLeft, Shield } from "lucide-react";
import { INITIAL_ASSIGNMENTS, INITIAL_TEACHERS, INITIAL_ELECTIONS } from "@/lib/mock_data";
import { ElectionAssignment } from "@/lib/types";

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<ElectionAssignment[]>(INITIAL_ASSIGNMENTS);
  const [selectedFaculty, setSelectedFaculty] = useState(INITIAL_TEACHERS[0].faculty_id);
  const [selectedElection, setSelectedElection] = useState(INITIAL_ELECTIONS[0].id);
  const [selectedRole, setSelectedRole] = useState<"VERIFICATION_OFFICER" | "ROSTER_REVIEWER" | "SUPERVISOR">("VERIFICATION_OFFICER");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    const faculty = INITIAL_TEACHERS.find((t) => t.faculty_id === selectedFaculty);
    const election = INITIAL_ELECTIONS.find((el) => el.id === selectedElection);
    if (!faculty || !election) return;

    const newAssignment: ElectionAssignment = {
      id: `asgn_${Date.now()}`,
      election_id: election.id,
      election_title: election.title,
      faculty_id: faculty.faculty_id,
      faculty_name: faculty.full_name,
      role: selectedRole,
      assigned_department: faculty.department,
      assigned_at_utc: new Date().toISOString(),
    };

    setAssignments([newAssignment, ...assignments]);
    setFeedback(`Assigned ${faculty.full_name} as ${selectedRole.replace(/_/g, " ")} for ${election.title}.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Admin Overview</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#10233F]/10 dark:bg-white/10 text-[#10233F] dark:text-white mb-1">
            <Award className="w-3.5 h-3.5 text-[#157E92]" aria-hidden="true" />
            Staff Delegations
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Election Assignments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Assign faculty verification officers and reviewers to specific election contests and departments.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Assignment Form */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#10233F] dark:text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#157E92]" aria-hidden="true" />
          <span>Create New Staff Assignment</span>
        </h2>
        <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="sel-faculty" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Faculty Member
            </label>
            <select
              id="sel-faculty"
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            >
              {INITIAL_TEACHERS.map((t) => (
                <option key={t.faculty_id} value={t.faculty_id}>
                  {t.full_name} ({t.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sel-elec" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Election Contest
            </label>
            <select
              id="sel-elec"
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            >
              {INITIAL_ELECTIONS.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sel-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Operational Role
            </label>
            <select
              id="sel-role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
            >
              <option value="VERIFICATION_OFFICER">Verification Officer</option>
              <option value="ROSTER_REVIEWER">Roster Reviewer</option>
              <option value="SUPERVISOR">Department Supervisor</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Assign Staff</span>
            </button>
          </div>
        </form>
      </div>

      {/* Assignments Table */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E3352]">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Current Active Assignments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Faculty Member</th>
                <th scope="col" className="px-6 py-3">Contest</th>
                <th scope="col" className="px-6 py-3">Department Scope</th>
                <th scope="col" className="px-6 py-3">Assigned Role</th>
                <th scope="col" className="px-6 py-3">Assigned Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {assignments.map((asgn) => (
                <tr key={asgn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#10233F] dark:text-white">{asgn.faculty_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{asgn.faculty_id}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
                    {asgn.election_title}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                    {asgn.assigned_department}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#15805D]/10 text-[#15805D]">
                      {asgn.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {new Date(asgn.assigned_at_utc).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
