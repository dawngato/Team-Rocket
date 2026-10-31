"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  UserCog,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Shield,
  RefreshCw,
  Users,
  Clock,
  Check,
  UserCheck2,
  GraduationCap,
  Vote,
  FileCheck2,
} from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";
import { userAuthStore, type UserRole, type SystemUser } from "@/lib/user_auth_store";

interface RegisteredUser {
  id: string;
  fullName?: string;
  email: string;
  external_id: string;
  status: string;
  roles: string[];
  created_at: string;
  roleAssignedBy?: string;
  roleAssignedAt?: string;
}

const AVAILABLE_ROLES = [
  { value: "super_admin", label: "Super Administrator", desc: "Full campus governance & system configuration" },
  { value: "administrator", label: "Campus Administrator", desc: "Faculty teacher rosters & departmental management" },
  { value: "election_officer", label: "Transparency Officer", desc: "Oversee election lifecycles & manage candidate rosters" },
  { value: "teacher", label: "Faculty Teacher", desc: "Class rosters & student voter verification queue" },
  { value: "auditor", label: "Independent Auditor", desc: "Cryptographic proof verification & trust pins" },
  { value: "student", label: "Student Voter", desc: "Ballot casting & receipt verification" },
];

export default function SuperAdminRoleAssignmentsPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("administrator");
  const [scope, setScope] = useState<string>("global");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError(null);

    // 1. Load users from localStorage institutional store
    const localStoreUsers = userAuthStore.getUsers();
    const localMap = new Map<string, RegisteredUser>();

    for (const u of localStoreUsers) {
      localMap.set(u.email.toLowerCase(), {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        external_id: u.id,
        status: u.status === "active" ? "ACTIVE" : u.status === "rejected" ? "REJECTED" : "PENDING_ROLE",
        roles: u.role ? [u.role] : [],
        created_at: u.createdAt,
        roleAssignedBy: u.roleAssignedBy,
        roleAssignedAt: u.roleAssignedAt,
      });
    }

    // 2. Try synchronizing with backend identity service if accessible
    try {
      let apiUsers: any[] = [];
      const res = await fetch("/api/identity/v1/admin/users", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        apiUsers = await res.json();
      } else {
        const fallbackRes = await fetch("http://127.0.0.1:8080/v1/admin/users", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (fallbackRes.ok) {
          apiUsers = await fallbackRes.json();
        }
      }

      if (Array.isArray(apiUsers)) {
        for (const u of apiUsers) {
          const emailKey = (u.email || "").toLowerCase();
          if (emailKey && !localMap.has(emailKey)) {
            localMap.set(emailKey, {
              id: u.id || `usr_ext_${Date.now()}`,
              fullName: u.full_name || u.fullName || u.email,
              email: u.email,
              external_id: u.external_id || u.id || "",
              status: u.status || "ACTIVE",
              roles: Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [],
              created_at: u.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // Identity backend is offline or not configured; local institutional store is fully authoritative
    } finally {
      const mergedList = Array.from(localMap.values());
      setUsers(mergedList);
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void fetchUsers();

    const handleSync = () => void fetchUsers();
    window.addEventListener("himvote_users_updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("himvote_users_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser.trim()) {
      setError("Please select a registered user or enter their institutional email.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const target = selectedUser.trim();

    try {
      // 1. Persist assignment immediately in the institutional authority store (localStorage)
      const updated = userAuthStore.assignRole(
        target,
        selectedRole as UserRole,
        "Super Administrator"
      );

      // 2. Dispatch background sync to backend identity service if reachable
      try {
        const payload = {
          user_email_or_id: updated.email,
          role: selectedRole,
          scope: scope.trim() || "global",
        };

        const res = await fetch("/api/identity/v1/admin/roles/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          await fetch("http://127.0.0.1:8080/v1/admin/roles/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
        }
      } catch {
        // Non-blocking backend sync; local institutional ledger has persisted the assignment
      }

      const roleObj = AVAILABLE_ROLES.find((r) => r.value === selectedRole);
      setSuccess(
        `Role '${roleObj ? roleObj.label : selectedRole}' successfully assigned to user ${updated.fullName} (${updated.email}) with scope '${scope.trim() || "global"}' (persisted to institutional store)!`
      );

      await fetchUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error assigning role.");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectQuickAssign = async (userEmail: string, roleVal: UserRole) => {
    try {
      const updated = userAuthStore.assignRole(userEmail, roleVal, "Super Administrator");

      try {
        await fetch("/api/identity/v1/admin/roles/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            user_email_or_id: updated.email,
            role: roleVal,
            scope: "global",
          }),
        });
      } catch {}

      const roleObj = AVAILABLE_ROLES.find((r) => r.value === roleVal);
      setSuccess(
        `Role '${roleObj ? roleObj.label : roleVal || "Pending"}' assigned to ${updated.fullName} (${updated.email}).`
      );
      setError(null);
      await fetchUsers();
      setTimeout(() => setSuccess(null), 5000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Quick role assignment failed.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      u.external_id.toLowerCase().includes(q)
    );
  });

  const pendingCount = users.filter((u) => u.roles.length === 0 || u.status === "PENDING_ROLE").length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6 dark:border-[#1E3352]">
        <p className="mb-1 inline-flex items-center gap-1.5 rounded bg-[#10233F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#10233F] dark:bg-white/10 dark:text-white">
          <Shield className="size-3.5 text-[#157E92]" aria-hidden="true" />
          Super Administrator Exclusive
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#10233F] dark:text-white">
          User Role Assignments
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Super Administrators hold exclusive authority to assign and upgrade roles for users registered on HimVote. Changes are synced with the institutional ledger and localStorage store.
        </p>
      </header>

      <SuperAdminNav />

      {/* Animated Telemetry Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Registered Accounts
          </span>
          <div className="mt-2 text-2xl font-extrabold font-mono text-[#10233F] dark:text-white">
            {loadingUsers ? "…" : users.length}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            {pendingCount > 0 ? `${pendingCount} awaiting role assignment` : "All accounts provisioned"}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Delegation Authority
          </span>
          <div className="mt-2 text-base font-bold text-[#15805D] dark:text-[#34D399] flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Sole Sovereign Delegator</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Dual localStorage &amp; backend persistence
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Identity Issuer Stream
          </span>
          <div className="mt-2 text-base font-bold text-[#157E92] dark:text-[#38BDF8] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#157E92] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#157E92]" />
            </span>
            <span>Cluster &amp; Store Synchronized</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Auto-synced across browser tabs
          </span>
        </motion.div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#C23C45]/30 bg-[#C23C45]/10 p-4 text-sm text-[#8B2630] dark:text-[#FCA5A5] flex items-center gap-2" role="alert">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#15805D]/30 bg-[#15805D]/10 p-4 text-sm font-semibold text-[#0F5B43] dark:text-[#34D399] flex items-center gap-2" role="status">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Role Assignment Form */}
        <section className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#10233F] dark:text-white flex items-center gap-2">
            <UserCog className="size-5 text-[#157E92]" />
            <span>Assign Role to Registered User</span>
          </h2>

          <form onSubmit={handleAssignRole} className="space-y-4">
            <div>
              <label htmlFor="target-user" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target User (Email or ID)
              </label>
              <input
                id="target-user"
                type="text"
                required
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="e.g. arungaming1973@gmail.com"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Select from the registered users table or type an institutional email directly.
              </span>
            </div>

            <div>
              <label htmlFor="assign-role-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role to Grant
              </label>
              <select
                id="assign-role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0B1524] text-sm text-[#10233F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assign-scope" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Delegated Scope
              </label>
              <input
                id="assign-scope"
                type="text"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="global, or Department Name"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Use <code>global</code> for campus-wide privileges, or department/election name.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] px-4 py-2 font-bold text-white bg-[#157E92] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm disabled:opacity-50"
            >
              <ShieldCheck className="size-4" />
              <span>{loading ? "Assigning Role..." : "Assign Role Immediately"}</span>
            </button>
          </form>
        </section>

        {/* Registered Users Table */}
        <section className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-[#1E3352] flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-[#10233F] dark:text-white">
                Registered Platform Users ({users.length})
              </h2>
              <button
                type="button"
                onClick={() => void fetchUsers()}
                className="p-1.5 text-slate-500 hover:text-[#157E92] transition-colors"
                title="Refresh user list"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search registered users..."
                className="w-full min-h-[38px] pl-9 pr-3 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0B1524] text-xs focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {loadingUsers ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading registered accounts...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No registered users found matching search.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/60 uppercase font-semibold text-slate-600 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">User &amp; Email</th>
                    <th className="px-4 py-3">Current Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Quick Assign &amp; Select</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
                  {filteredUsers.map((u) => {
                    const isPending = u.roles.length === 0 || u.status === "PENDING_ROLE";
                    const isSuper = u.roles.includes("super_admin");

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 hover:shadow-sm transition-all duration-150"
                      >
                        <td className="px-4 py-3.5 font-medium text-[#10233F] dark:text-white">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{u.fullName || u.email.split("@")[0]}</span>
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <Clock className="size-2.5" />
                                PENDING
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono select-all">
                            {u.email}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.external_id}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          {u.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => {
                                const roleMeta = AVAILABLE_ROLES.find((ar) => ar.value === r);
                                return (
                                  <span
                                    key={r}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      r === "super_admin"
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300"
                                        : r === "administrator"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300"
                                        : r === "teacher"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                                        : r === "student"
                                        ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300"
                                        : r === "election_officer"
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300"
                                        : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300"
                                    }`}
                                  >
                                    {roleMeta ? roleMeta.label : r}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <Clock className="size-2.5 animate-pulse" />
                              Pending Role
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === "ACTIVE"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isSuper ? (
                            <span className="text-[11px] text-slate-400 italic">Protected Root</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* Quick One-Click Approval for Pending Users */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleDirectQuickAssign(u.email, "student")}
                                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                                  title="Approve as Student Voter immediately"
                                >
                                  + Student
                                </button>
                              )}

                              {/* Direct Role Dropdown */}
                              <select
                                value={u.roles[0] || ""}
                                onChange={(e) => {
                                  const val = e.target.value as UserRole;
                                  void handleDirectQuickAssign(u.email, val || null);
                                }}
                                aria-label={`Direct role for ${u.email}`}
                                className="h-7 px-1.5 text-[11px] font-semibold rounded-md border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0B1524] text-slate-800 dark:text-white"
                              >
                                <option value="">-- Role --</option>
                                <option value="administrator">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                                <option value="election_officer">Officer</option>
                                <option value="auditor">Auditor</option>
                              </select>

                              {/* Select into Form Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(u.email);
                                  if (u.roles[0]) setSelectedRole(u.roles[0]);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold rounded-md border border-[#157E92] text-[#157E92] hover:bg-[#157E92] hover:text-white transition-colors"
                              >
                                Select
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
