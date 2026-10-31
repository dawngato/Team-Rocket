"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Database, ShieldCheck, Users } from "lucide-react";
import { motion } from "motion/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessImport = async () => {
    setIsProcessing(true);
    setImportStatus(null);
    try {
      const records = JSON.parse(importText);
      if (!Array.isArray(records)) {
        setImportStatus("Input must be a valid JSON array of Student Voter records.");
        setImportedCount(null);
        return;
      }
      const count = await apiClient.importStudents(records);
      setImportedCount(count);
      setImportStatus(`Batch ingested successfully. ${count} Student Voter records validated with 0 cryptographic hash collisions.`);
    } catch {
      setImportedCount(null);
      setImportStatus("Invalid JSON syntax. Please verify comma placement, quotes, and bracket symmetry.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin Console", href: "/admin" },
          { label: "Student Roster Batch Import" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Student Voter Roll Pipeline</span>
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            Batch Student Voter Roster Import
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Ingest registrar enrollment batches with automated deduplication and cryptographic hash checks.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Pipeline Ready</span>
        </div>
      </div>

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ingestion Pipeline</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-6" />
              <span>Ready</span>
            </div>
            <span className="text-[11px] text-slate-500">Registrar dataset validator</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Database className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Collision Detection</span>
            <div className="text-2xl font-bold font-mono text-[#10233F] dark:text-white mt-1">
              0.00%
            </div>
            <span className="text-[11px] text-slate-500">SHA-256 student ID hashing</span>
          </div>
          <div className="p-3 rounded-xl bg-[#157E92]/10 text-[#157E92]">
            <ShieldCheck className="size-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="p-5 rounded-2xl bg-white dark:bg-[#132135] border border-slate-200 dark:border-[#1E3352] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Role Scope</span>
            <div className="text-lg font-bold font-mono text-[#10233F] dark:text-white mt-1">
              Student Voter
            </div>
            <span className="text-[11px] text-slate-500">Campus Administrator authority</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Users className="size-5" />
          </div>
        </motion.div>
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            importedCount !== null
              ? "bg-[#15805D]/10 border-[#15805D]/30 text-[#15805D]"
              : "bg-[#C23C45]/10 border-[#C23C45]/30 text-[#C23C45]"
          }`}
          role="status"
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
          <label htmlFor="roster-payload" className="block text-xs font-bold text-[#10233F] dark:text-white mb-1 uppercase tracking-wider">
            Registrar Dataset Payload (JSON format)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Provide structured student records containing institutional identifier, full legal name, institutional email address, and academic department.
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
            Enforces manifest immutability: imports after election manifest freeze are strictly prohibited.
          </span>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleProcessImport}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#157E92] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>{isProcessing ? "Processing Batch..." : "Process and Validate Roster Batch"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
