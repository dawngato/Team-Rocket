"use client";

import React, { useEffect, useState } from "react";
import { UserCog, CheckCircle2, AlertTriangle, ShieldCheck, Search, Shield, RefreshCw } from "lucide-react";
import { SuperAdminNav } from "@/components/SuperAdminNav";

interface RegisteredUser {
  id: string;
  email: string;
  external_id: string;
  status: string;
  roles: string[];
  created_at: string;
}

const AVAILABLE_ROLES = [
  { value: "super_admin", label: "Super Administrator", desc: "Full campus governance & system configuration" },
  { value: "administrator", label: "Campus Administrator", desc: "Teacher rosters & departmental management" },
  { value: "election_officer", label: "Election Officer", desc: "Build elections & manage candidate rosters" },
  { value: "teacher", label: "Teacher / Faculty", desc: "Class rosters & student verification queue" },
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
    try {
      const res = await fetch("/api/identity/v1/admin/users", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        // Fallback directly to backend port if proxy route not used
        const fallbackRes = await fetch("http://127.0.0.1:8080/v1/admin/users", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!fallbackRes.ok) throw new Error("Could not load registered users list.");
        const data = await fallbackRes.json();
        setUsers(data);
      } else {
        const data = await res.json();
        setUsers(data);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registered accounts list is unavailable.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError("Please select a registered user or enter their institutional email.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        user_email_or_id: selectedUser,
        role: selectedRole,
        scope: scope.trim() || "global",
      };

      let res = await fetch("/api/identity/v1/admin/roles/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetch("http://127.0.0.1:8080/v1/admin/roles/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Failed to assign role to user.");
      }

      const data = await res.json();
      setSuccess(`Role '${data.role}' successfully assigned to user ${data.email} with scope '${data.scope}'!`);
      await fetchUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error assigning role.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.external_id.toLowerCase().includes(search.toLowerCase())
  );

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
          Super Administrators have exclusive authority to assign and upgrade roles for users already registered on HimVote.
        </p>
      </header>

      <SuperAdminNav />

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
            Assign Role to Registered User
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
                placeholder="e.g. user@university.edu"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3352] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#157E92]"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Select from the registered users table or type directly.
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
                    <th className="px-4 py-3">User Email</th>
                    <th className="px-4 py-3">Current Roles</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[#10233F] dark:text-white">
                        <div>{u.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.external_id}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#157E92]/10 text-[#157E92] dark:bg-[#157E92]/20 dark:text-[#38BDF8]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
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
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u.email)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[#157E92] text-[#157E92] hover:bg-[#157E92] hover:text-white transition-colors"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
