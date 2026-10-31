"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck2,
  Search,
  UserX,
  ShieldAlert,
  GraduationCap,
  Vote,
  FileCheck2,
  RefreshCw,
  Users,
  Download,
  AlertCircle,
  X,
  Lock,
  Filter,
  Check,
  Shield,
  Sparkles,
} from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { userAuthStore, type SystemUser, type UserRole } from "@/lib/user_auth_store";

export default function SuperAdminRoleRequestsPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "info" | "warning"; message: string } | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<SystemUser | null>(null);

  const loadUsers = () => {
    const list = userAuthStore.getUsers();
    setUsers([...list]);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAssignRole = (userId: string, newRole: UserRole) => {
    try {
      const targetUser = users.find((u) => u.id === userId);
      if (targetUser?.role === "super_admin") {
        setFeedback({
          type: "warning",
          message: "The Super Administrator role is protected and cannot be modified here.",
        });
        return;
      }

      const updated = userAuthStore.assignRole(userId, newRole, "Super Administrator");
      const roleName = newRole ? getRoleLabel(newRole) : "Pending Assignment";
      setFeedback({
        type: "success",
        message: `Role successfully changed to "${roleName}" for ${updated.fullName} (${updated.email}).`,
      });
      loadUsers();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err) {
      setFeedback({
        type: "warning",
        message: err instanceof Error ? err.message : "Failed to assign role.",
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    try {
      if (deleteConfirmUser.role === "super_admin") {
        setFeedback({
          type: "warning",
          message: "Root Super Administrator accounts cannot be deleted.",
        });
        setDeleteConfirmUser(null);
        return;
      }
      userAuthStore.deleteUser(deleteConfirmUser.id);
      setFeedback({
        type: "info",
        message: `User ${deleteConfirmUser.fullName} (${deleteConfirmUser.email}) has been permanently removed.`,
      });
      setDeleteConfirmUser(null);
      loadUsers();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: "warning",
        message: err instanceof Error ? err.message : "Failed to delete user.",
      });
      setDeleteConfirmUser(null);
    }
  };

  const handleExportRoster = () => {
    try {
      const headers = [
        "User ID",
        "Full Name",
        "Email Address",
        "Assigned Role",
        "Account Status",
        "Registration Date",
        "Role Assigned By",
        "Role Assigned Timestamp",
      ];
      const rows = users.map((u) => [
        u.id,
        `"${u.fullName.replace(/"/g, '""')}"`,
        `"${u.email.replace(/"/g, '""')}"`,
        u.role || "pending_role",
        u.status,
        u.createdAt,
        `"${(u.roleAssignedBy || "System Genesis").replace(/"/g, '""')}"`,
        u.roleAssignedAt || "N/A",
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `himvote_institutional_roster_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedback({
        type: "success",
        message: "Institutional user roster successfully exported as CSV.",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({
        type: "warning",
        message: "Failed to generate CSV export file.",
      });
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case "super_admin":
        return "Super Administrator";
      case "administrator":
        return "Campus Administrator";
      case "teacher":
        return "Academic Faculty";
      case "student":
        return "Student Voter";
      case "election_officer":
        return "Transparency Officer";
      default:
        return "Pending Role Assignment";
    }
  };

  const getRoleBadgeClasses = (role: UserRole): { pill: string; dot: string } => {
    switch (role) {
      case "super_admin":
        return {
          pill: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800",
          dot: "bg-purple-600 dark:bg-purple-400",
        };
      case "administrator":
        return {
          pill: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
          dot: "bg-blue-600 dark:bg-blue-400",
        };
      case "teacher":
        return {
          pill: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
          dot: "bg-emerald-600 dark:bg-emerald-400",
        };
      case "student":
        return {
          pill: "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800",
          dot: "bg-cyan-600 dark:bg-cyan-400",
        };
      case "election_officer":
        return {
          pill: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
          dot: "bg-amber-600 dark:bg-amber-400",
        };
      default:
        return {
          pill: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800",
          dot: "bg-rose-600 dark:bg-rose-400 animate-ping",
        };
    }
  };

  // Metrics
  const totalCount = users.length;
  const pendingCount = users.filter((u) => !u.role || u.status === "pending_role").length;
  const adminCount = users.filter((u) => u.role === "administrator").length;
  const teacherCount = users.filter((u) => u.role === "teacher").length;
  const studentCount = users.filter((u) => u.role === "student").length;
  const officerCount = users.filter((u) => u.role === "election_officer").length;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (filterRole === "all") return true;
      if (filterRole === "pending") return !u.role || u.status === "pending_role";
      return u.role === filterRole;
    });
  }, [users, searchQuery, filterRole]);

  return (
    <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-8 space-y-8">
      {/* Top Banner / Breadcrumb Header */}
      <header className="border-b border-slate-200 dark:border-[#1E3352] pb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8] border border-[#157E92]/20 mb-2">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Supreme Institutional Authority • Role Delegation Console</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10233F] dark:text-white tracking-tight">
              User Role Delegation Command Center
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-2 max-w-4xl leading-relaxed">
              In accordance with institutional governance, self-registration does not confer permissions. Only the Super Administrator holds sovereign authority to elevate accounts to <strong className="text-[#10233F] dark:text-white">Campus Administrator</strong>, <strong className="text-[#10233F] dark:text-white">Academic Faculty</strong>, <strong className="text-[#10233F] dark:text-white">Student Voter</strong>, or <strong className="text-[#10233F] dark:text-white">Transparency & Audit Officer</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportRoster}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E3352] font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export User Roster</span>
            </button>
            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#132135] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E3352] font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <SuperAdminNav />

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4.5 text-sm font-medium shadow-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
              : feedback.type === "info"
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#15805D]" />
            ) : feedback.type === "info" ? (
              <Sparkles className="w-5 h-5 flex-shrink-0 text-blue-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            aria-label="Dismiss feedback notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bento Grid Metrics */}
      <section aria-labelledby="bento-statistics-title" className="space-y-3">
        <h2 id="bento-statistics-title" className="sr-only">
          Institutional User Distribution Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
          {/* Total Registered */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1E3352] flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-[#10233F] dark:text-white tabular-nums">
              {totalCount}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enrolled institutional base</p>
          </div>

          {/* Pending Assignment */}
          <div className="p-5 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-300">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Role</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
              {pendingCount}
            </div>
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">Awaiting delegation</p>
          </div>

          {/* Campus Admins */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Campus Admins</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UserCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
              {adminCount}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Scoped election managers</p>
          </div>

          {/* Teachers / Faculty */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Academic Faculty</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {teacherCount}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Department instructors</p>
          </div>

          {/* Students */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Student Voters</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Vote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 tabular-nums">
              {studentCount}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verified elector base</p>
          </div>

          {/* Transparency Officers */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Transparency Officers</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {officerCount}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Audit & integrity supervisors</p>
          </div>

          {/* Audit Integrity Status */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-[#10233F]/5 dark:bg-[#10233F]/30 shadow-sm">
            <div className="flex items-center justify-between text-[#157E92] dark:text-[#38BDF8]">
              <span className="text-xs font-bold uppercase tracking-wider">Ledger Integrity</span>
              <div className="w-8 h-8 rounded-lg bg-[#157E92]/10 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-[#10233F] dark:text-white">
              100%
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sovereign dual-control active</p>
          </div>
        </div>
      </section>

      {/* Control Bar: Full-Width Search & Filter Pills */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-5 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by full name, institutional email, or user identifier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 text-sm rounded-xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/80 dark:bg-[#0B1524] text-[#10233F] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#157E92] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Result Counter & Live Status */}
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>
              Showing <strong className="text-[#10233F] dark:text-white font-bold">{filteredUsers.length}</strong> of {totalCount} total accounts
            </span>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#1E3352]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Role Filter:</span>
          </span>

          <button
            type="button"
            onClick={() => setFilterRole("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterRole === "all"
                ? "bg-[#10233F] text-white dark:bg-[#157E92] shadow-sm"
                : "bg-slate-100 dark:bg-[#1E3352] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#253d61]"
            }`}
          >
            All Identities ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterRole("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterRole === "pending"
                ? "bg-rose-700 text-white shadow-sm"
                : "bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-200/80"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pending Assignment ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterRole("administrator")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterRole === "administrator"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-blue-100/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200/80"
            }`}
          >
            <UserCheck2 className="w-3 h-3" />
            <span>Campus Admins ({adminCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterRole("teacher")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterRole === "teacher"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/80"
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            <span>Academic Faculty ({teacherCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterRole("student")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterRole === "student"
                ? "bg-cyan-700 text-white shadow-sm"
                : "bg-cyan-100/70 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200/80"
            }`}
          >
            <Vote className="w-3 h-3" />
            <span>Student Voters ({studentCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterRole("election_officer")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterRole === "election_officer"
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200/80"
            }`}
          >
            <FileCheck2 className="w-3 h-3" />
            <span>Transparency Officers ({officerCount})</span>
          </button>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm">
        <div className="border-b border-slate-200 dark:border-[#1E3352] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#0B1524]/60">
          <div>
            <h2 className="text-base font-bold text-[#10233F] dark:text-white flex items-center gap-2">
              <span>Institutional Identity Ledger</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#157E92]/10 text-[#157E92] dark:text-[#38BDF8]">
                {filteredUsers.length} Records
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select or reassign institutional capabilities. All changes are signed and persisted in the local authority store.
            </p>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-base">
              No matching accounts found
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No registered user matches your current query or role filter. Try resetting filters or verifying user registration.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterRole("all");
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#157E92] text-white hover:bg-[#106575] transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E3352] bg-slate-50/90 dark:bg-[#0B1524] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th scope="col" className="px-6 py-4">User Identity & Credentials</th>
                  <th scope="col" className="px-6 py-4">Registration & Timestamp</th>
                  <th scope="col" className="px-6 py-4">Delegation Status</th>
                  <th scope="col" className="px-6 py-4">Governance Record</th>
                  <th scope="col" className="px-6 py-4 text-right">Direct Role Delegation Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
                {filteredUsers.map((user) => {
                  const isSuper = user.role === "super_admin";
                  const badgeClasses = getRoleBadgeClasses(user.role);

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#0E1A2B]/60 transition-colors group"
                    >
                      {/* Identity & Email */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase flex-shrink-0 border ${
                              isSuper
                                ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200"
                                : user.role === "administrator"
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200"
                                : user.role === "teacher"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                                : user.role === "student"
                                ? "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200"
                                : user.role === "election_officer"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200"
                            }`}
                          >
                            {user.fullName ? user.fullName.substring(0, 2) : "HV"}
                          </div>
                          <div>
                            <div className="font-bold text-[#10233F] dark:text-white text-sm flex items-center gap-2">
                              <span>{user.fullName}</span>
                              {isSuper && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>ROOT</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 select-all">
                              {user.email}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Registration Stamp */}
                      <td className="px-6 py-4.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">
                          {new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {new Date(user.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Role Delegation Status Pill */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeClasses.pill}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${badgeClasses.dot}`} aria-hidden="true" />
                          <span>{getRoleLabel(user.role)}</span>
                        </span>
                      </td>

                      {/* Governance Record */}
                      <td className="px-6 py-4.5 text-xs whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {user.roleAssignedBy ? (
                            <span className="font-semibold text-[#157E92] dark:text-[#38BDF8]">
                              {user.roleAssignedBy}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending Assignment</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {user.roleAssignedAt
                            ? new Date(user.roleAssignedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Awaiting Action"}
                        </div>
                      </td>

                      {/* Direct Role Delegation Controls */}
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        {isSuper ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium border border-slate-200 dark:border-slate-700">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Protected Super Admin</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-2 flex-wrap">
                            {/* Standard Dropdown Selector */}
                            <select
                              value={user.role || ""}
                              onChange={(e) => {
                                const val = e.target.value as UserRole;
                                handleAssignRole(user.id, val ? val : null);
                              }}
                              aria-label={`Select assigned role for ${user.fullName}`}
                              className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0B1524] text-[#10233F] dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
                            >
                              <option value="">-- Assign Role --</option>
                              <option value="administrator">Campus Administrator</option>
                              <option value="teacher">Academic Faculty</option>
                              <option value="student">Student Voter</option>
                              <option value="election_officer">Transparency Officer</option>
                            </select>

                            {/* Quick Button: Campus Administrator */}
                            <button
                              type="button"
                              onClick={() => handleAssignRole(user.id, "administrator")}
                              disabled={user.role === "administrator"}
                              title="Assign Campus Administrator role"
                              className={`h-9 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all ${
                                user.role === "administrator"
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm opacity-90 cursor-default"
                                  : "border-slate-300 dark:border-[#1E3352] bg-slate-50 dark:bg-[#1E3352] text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600"
                              }`}
                            >
                              Admin
                            </button>

                            {/* Quick Button: Faculty */}
                            <button
                              type="button"
                              onClick={() => handleAssignRole(user.id, "teacher")}
                              disabled={user.role === "teacher"}
                              title="Assign Faculty role"
                              className={`h-9 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all ${
                                user.role === "teacher"
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm opacity-90 cursor-default"
                                  : "border-slate-300 dark:border-[#1E3352] bg-slate-50 dark:bg-[#1E3352] text-slate-700 dark:text-slate-200 hover:border-emerald-400 hover:text-emerald-600"
                              }`}
                            >
                              Teacher
                            </button>

                            {/* Quick Button: Student Voter */}
                            <button
                              type="button"
                              onClick={() => handleAssignRole(user.id, "student")}
                              disabled={user.role === "student"}
                              title="Assign Student Voter role"
                              className={`h-9 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all ${
                                user.role === "student"
                                  ? "bg-cyan-600 text-white border-cyan-600 shadow-sm opacity-90 cursor-default"
                                  : "border-slate-300 dark:border-[#1E3352] bg-slate-50 dark:bg-[#1E3352] text-slate-700 dark:text-slate-200 hover:border-cyan-400 hover:text-cyan-600"
                              }`}
                            >
                              Student
                            </button>

                            {/* Quick Button: Transparency Officer */}
                            <button
                              type="button"
                              onClick={() => handleAssignRole(user.id, "election_officer")}
                              disabled={user.role === "election_officer"}
                              title="Assign Transparency & Election Officer role"
                              className={`h-9 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all ${
                                user.role === "election_officer"
                                  ? "bg-amber-600 text-white border-amber-600 shadow-sm opacity-90 cursor-default"
                                  : "border-slate-300 dark:border-[#1E3352] bg-slate-50 dark:bg-[#1E3352] text-slate-700 dark:text-slate-200 hover:border-amber-400 hover:text-amber-600"
                              }`}
                            >
                              Officer
                            </button>

                            {/* Revoke Role Button */}
                            {user.role && (
                              <button
                                type="button"
                                onClick={() => handleAssignRole(user.id, null)}
                                title="Revoke assigned permissions back to pending"
                                className="h-9 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-300 dark:border-rose-900 transition-colors shadow-sm"
                              >
                                Revoke
                              </button>
                            )}

                            {/* Remove User Action */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(user)}
                              title={`Delete account for ${user.fullName}`}
                              className="h-9 w-9 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors"
                              aria-label={`Delete ${user.fullName}`}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-[#10233F] dark:text-white">
                  Confirm User Account Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Institutional Identity Ledger Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the account for <strong className="text-[#10233F] dark:text-white font-semibold">{deleteConfirmUser.fullName}</strong> (<span className="font-mono">{deleteConfirmUser.email}</span>)? This will erase their assigned capabilities and identity credentials.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1E3352]">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#1E3352] hover:bg-slate-100 dark:hover:bg-[#1E3352] text-slate-700 dark:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
              >
                Permanently Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Governance Invariants Callout */}
      <footer className="rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-slate-50/80 dark:bg-[#0E1A2B] p-6 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-[#10233F] dark:text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#15805D]" aria-hidden="true" />
          <span>Role Delegation Governance Protocol</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#10233F] dark:text-white block mb-1">Exclusive Authority</span>
            Only Super Administrators can assign roles. Unassigned users remain in pending quarantine without elevated workspace access.
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#10233F] dark:text-white block mb-1">Revocation Rights</span>
            Any granted role may be instantly revoked back to pending state, immediately invalidating active session tokens.
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#10233F] dark:text-white block mb-1">Protected Root Account</span>
            The root Super Administrator identity cannot be deleted or demoted via this delegation interface.
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135]">
            <span className="font-bold text-[#10233F] dark:text-white block mb-1">Audit Trail Logging</span>
            Every role transition records the delegator identifier, previous state, and epoch timestamp in the immutable audit log.
          </div>
        </div>
      </footer>
    </div>
  );
}
