"use client";

import React, { useState } from "react";
import { UserCheck, CheckCircle2, AlertTriangle, Send, FileEdit } from "lucide-react";

interface CorrectionRequest {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  type: string;
  reason: string;
  status: "PENDING_REGISTRAR" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

export default function RosterCorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([
    {
      id: "corr_01",
      studentId: "HPTU 2024 ECE 019",
      studentName: "Sneha Mukherjee",
      department: "Electronics and Communication",
      type: "ID Scan Resolution",
      reason: "Verified original physical student identification card in department office.",
      status: "APPROVED",
      submittedAt: "2026-10-29T11:00:00Z",
    },
    {
      id: "corr_02",
      studentId: "HPTU 2022 MECH 088",
      studentName: "Divyansh Chauhan",
      department: "Mechanical Engineering",
      type: "Semester Fee Clearance",
      reason: "Fee clearance slip verified by faculty coordinator. Eligible for voting roster.",
      status: "PENDING_REGISTRAR",
      submittedAt: "2026-10-30T09:30:00Z",
    },
  ]);

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [department, setDepartment] = useState("Computer Science and Engineering");
  const [correctionType, setCorrectionType] = useState("Department Transfer");
  const [reason, setReason] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: CorrectionRequest = {
      id: `corr_${Date.now()}`,
      studentId,
      studentName,
      department,
      type: correctionType,
      reason,
      status: "PENDING_REGISTRAR",
      submittedAt: new Date().toISOString(),
    };
    setRequests([newReq, ...requests]);
    setStudentId("");
    setStudentName("");
    setReason("");
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <FileEdit className="w-3.5 h-3.5" aria-hidden="true" />
            Roster Corrections
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Voter Roster Corrections Desk
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Submit faculty attestations for disputed student records prior to election manifest freezing.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-[#15805D]/10 border border-[#15805D]/30 text-[#15805D] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          <span>Correction request forwarded to Central Registrar for audit confirmation.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4"
          >
            <h2 className="font-bold text-base text-[#10233F] dark:text-white mb-2">
              Submit Correction Notice
            </h2>

            <div>
              <label htmlFor="corr-student-id" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student Identifier
              </label>
              <input
                id="corr-student-id"
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. HPTU 2023 CS 042"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="corr-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                id="corr-name"
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student full name"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <div>
              <label htmlFor="corr-dept" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                id="corr-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="Computer Science and Engineering">Computer Science</option>
                <option value="Electronics and Communication">Electronics</option>
                <option value="Mechanical Engineering">Mechanical</option>
                <option value="Civil Engineering">Civil</option>
              </select>
            </div>

            <div>
              <label htmlFor="corr-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correction Classification
              </label>
              <select
                id="corr-type"
                value={correctionType}
                onChange={(e) => setCorrectionType(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                <option value="Department Transfer">Department Transfer</option>
                <option value="ID Scan Resolution">ID Scan Resolution</option>
                <option value="Semester Fee Clearance">Semester Fee Clearance</option>
                <option value="Name Spelling Correction">Name Spelling Correction</option>
              </select>
            </div>

            <div>
              <label htmlFor="corr-reason" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason and Evidence Reference
              </label>
              <textarea
                id="corr-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the justification and reference documents examined..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Submit Attestation to Registrar</span>
            </button>
          </form>
        </div>

        {/* List of Submitted Requests */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-bold text-base text-[#10233F] dark:text-white">
            Attestation Log and Status
          </h2>
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-[#10233F] dark:text-white">
                      {req.studentName}
                    </h3>
                    <span className="font-mono text-xs text-slate-500">{req.studentId}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                      req.status === "APPROVED"
                        ? "bg-[#15805D]/10 text-[#15805D] border border-[#15805D]/30"
                        : "bg-[#AA6C0B]/10 text-[#AA6C0B] border border-[#AA6C0B]/30"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Classification:
                    </span>{" "}
                    {req.type}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Reason:
                    </span>{" "}
                    {req.reason}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  Logged: {new Date(req.submittedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
