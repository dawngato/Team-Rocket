"use client";

import React, { useState } from "react";
import { UserCheck, Plus, CheckCircle2, XCircle, Search } from "lucide-react";
import { INITIAL_TEACHERS } from "@/lib/mock_data";
import { TeacherRecord } from "@/lib/types";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyId, setNewFacultyId] = useState("");
  const [newDept, setNewDept] = useState("Computer Science and Engineering");
  const [isAdding, setIsAdding] = useState(false);

  const toggleStatus = (id: string) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const created: TeacherRecord = {
      id: `tch_${Date.now()}`,
      faculty_id: newFacultyId,
      full_name: newFacultyName,
      department: newDept,
      role: "Department Verification Officer",
      active: true,
    };
    setTeachers([created, ...teachers]);
    setNewFacultyName("");
    setNewFacultyId("");
    setIsAdding(false);
  };

  const filtered = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.faculty_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            Faculty Governance
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Teachers and Verification Officers
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Assign department teachers authorized to verify student identities and certify roster corrections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{isAdding ? "Cancel" : "Add Faculty Officer"}</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddTeacher}
          className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
        >
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Register New Verification Officer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tch-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Faculty Name
              </label>
              <input
                id="tch-name"
                type="text"
                required
                value={newFacultyName}
                onChange={(e) => setNewFacultyName(e.target.value)}
                placeholder="Dr. Full Name"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
            <div>
              <label htmlFor="tch-id" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Faculty Identification
              </label>
              <input
                id="tch-id"
                type="text"
                required
                value={newFacultyId}
                onChange={(e) => setNewFacultyId(e.target.value)}
                placeholder="FAC CS 099"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
            <div>
              <label htmlFor="tch-dept" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                id="tch-dept"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="Computer Science and Engineering">Computer Science</option>
                <option value="Electronics and Communication">Electronics</option>
                <option value="Mechanical Engineering">Mechanical</option>
                <option value="Civil Engineering">Civil</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 font-bold text-white bg-[#15805D] hover:bg-[#10664A] rounded-lg transition-colors text-sm shadow-sm"
          >
            Save Faculty Record
          </button>
        </form>
      )}

      {/* Teachers Directory */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#1E3352] text-slate-500 uppercase tracking-wider font-semibold">
                <th scope="col" className="px-6 py-4">Faculty Name</th>
                <th scope="col" className="px-6 py-4">Department</th>
                <th scope="col" className="px-6 py-4">Role Assignment</th>
                <th scope="col" className="px-6 py-4">Active Status</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {filtered.map((tch) => (
                <tr key={tch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-[#10233F] dark:text-white">
                      {tch.full_name}
                    </div>
                    <div className="font-mono text-slate-500 text-[11px]">{tch.faculty_id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                    {tch.department}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                    {tch.role}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        tch.active
                          ? "bg-[#15805D]/10 text-[#15805D] border border-[#15805D]/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {tch.active ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleStatus(tch.id)}
                      className="min-h-[44px] px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {tch.active ? "Deactivate" : "Activate"}
                    </button>
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
