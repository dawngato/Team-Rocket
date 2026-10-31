"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, UserCheck, Users, Mail, Building, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api_client";
import type { TeacherRecord } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    void apiClient
      .getTeachers()
      .then((records) => {
        setTeachers(records);
        setError(null);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Teacher directory unavailable.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(load, []);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiClient.createInvitation({ email, role: "teacher", scope });
      setMessage(
        `Teacher invitation ${result.invitation_id} was persisted. The account is activated only after secure redemption.`
      );
      setEmail("");
      setScope("");
      setShowForm(false);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Teacher invitation was rejected.");
    } finally {
      setBusy(false);
    }
  };

  const breadcrumbs = [
    { label: "Workspace", href: "/admin" },
    { label: "Faculty Directory" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-[#1E3352]">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-[#157E92]/10 px-2.5 py-0.5 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8]">
            <Users className="size-3.5" aria-hidden="true" />
            Faculty Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10233F] dark:text-white">
            Faculty Teachers &amp; Verification Officers
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Authoritative faculty directory delegated with student voter identity verification authority.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#157E92] hover:bg-[#0E6273] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>{showForm ? "Cancel" : "Invite Faculty Teacher"}</span>
        </button>
      </header>

      {/* Statistics and Telemetry Tiles on Entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Faculty Teachers
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#10233F] dark:text-white">
            {loading ? "…" : teachers.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Assigned departmental verification officers
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Verification Protocol
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Blind Signature Issuer</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Zero knowledge voter token signing
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Roster Status
          </span>
          <div className="mt-2 text-base font-bold text-[#157E92] dark:text-[#38BDF8] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#157E92] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#157E92]" />
            </span>
            <span>Identity Service Sync</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Authoritative institutional directory
          </span>
        </motion.div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-xs sm:text-sm font-medium text-[#8B2630] dark:text-[#FCA5A5]"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-xs sm:text-sm font-semibold text-[#0F5B43] dark:text-[#86EFAC]"
          role="status"
        >
          {message}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onSubmit={invite}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1E3352] dark:bg-[#132135] space-y-4"
          >
            <h2 className="text-sm font-bold text-[#10233F] dark:text-white">
              Issue Delegated Faculty Teacher Invitation
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="teacher-email"
                  className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Faculty Institutional Email
                </label>
                <input
                  id="teacher-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="faculty@hptu.ac.in"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="teacher-scope"
                  className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Department / Program Scope
                </label>
                <input
                  id="teacher-scope"
                  required
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  placeholder="e.g. Computer Science or CSE-2026"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 text-sm outline-none transition focus:border-[#157E92] focus:ring-2 focus:ring-[#157E92]/20 dark:border-[#1E3352] dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#15805D] hover:bg-[#10664A] px-5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {busy ? "Submitting to Registrar…" : "Issue Verified Invitation"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#1E3352] dark:bg-[#132135]">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5 font-bold text-[#10233F] dark:border-[#1E3352] dark:text-white text-sm">
          <UserCheck className="size-5 text-[#157E92]" aria-hidden="true" />
          Authoritative Teacher Directory
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/50 dark:text-slate-400 border-b border-slate-100 dark:border-[#1E3352]">
              <tr>
                <th className="px-5 py-3.5">Teacher</th>
                <th className="px-5 py-3.5">Department Scope</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Role Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    Loading faculty roster…
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No teacher records returned in your assigned institutional scope.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all duration-150">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {teacher.email || teacher.full_name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {teacher.scope || teacher.department || "Institutional"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-[#15805D]/10 px-2 py-0.5 text-[11px] font-bold text-[#15805D] dark:text-[#34D399]">
                        {teacher.status || (teacher.active ? "ACTIVE" : "PENDING")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs uppercase">
                      {teacher.role}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
