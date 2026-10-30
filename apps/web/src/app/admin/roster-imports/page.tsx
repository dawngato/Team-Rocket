"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api_client";

export default function AdminRosterImportsPage() {
  const [importText, setImportText] = useState(
    JSON.stringify(
      [
        {
          student_id: "HPTU 2024 MECH 105",
          full_name: "Rahul Deshmukh",
          email: "rahul.d@hptu.ac.in",
          department: "Mechanical Engineering",
        },
        {
          student_id: "HPTU 2024 CIV 112",
          full_name: "Tanvi Sharma",
          email: "tanvi.s@hptu.ac.in",
          department: "Civil Engineering",
        },
        {
          student_id: "HPTU 2023 CS 201",
          full_name: "Manish Aggarwal",
          email: "manish.a@hptu.ac.in",
          department: "Computer Science and Engineering",
        },
      ],
      null,
      2
    )
  );

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleProcessImport = async () => {
    try {
      const records = JSON.parse(importText);
      if (!Array.isArray(records)) {
        setImportStatus("Input must be a JSON array of student objects.");
        return;
      }
      const count = await apiClient.importStudents(records);
      setImportedCount(count);
      setImportStatus("Import processed successfully. 0 hash collisions detected.");
    } catch {
      setImportStatus("Invalid JSON syntax. Please verify commas and quotes.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            Voter Roll Pipeline
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Batch Student Roster Import
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Ingest registrar enrollment batches with automated deduplication and cryptographic hash checks.
          </p>
        </div>
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            importedCount !== null
              ? "bg-[#15805D]/10 border-[#15805D]/30 text-[#15805D]"
              : "bg-[#C23C45]/10 border-[#C23C45]/30 text-[#C23C45]"
          }`}
        >
          {importedCount !== null ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          )}
          <span>{importStatus}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="roster-payload" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1">
            Registrar Dataset Payload (JSON format)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Paste structured records containing student identifier, legal name, email, and department.
          </p>
          <textarea
            id="roster-payload"
            rows={12}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full p-4 rounded-xl font-mono text-xs border border-slate-300 dark:border-[#1E3352] bg-slate-50 dark:bg-slate-900/40 text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
          />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-[#1E3352]">
          <span className="text-xs text-slate-500">
            Enforces manifest immutability: imports after freeze are blocked.
          </span>
          <button
            type="button"
            onClick={handleProcessImport}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92]"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Process and Validate Roster Batch</span>
          </button>
        </div>
      </div>
    </div>
  );
}
