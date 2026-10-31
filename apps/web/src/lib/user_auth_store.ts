// Centralized User & Role Management Store for HimVote
// Enforces: Only Super Admin can assign roles (Admin, Teacher, Student, Officer)
// Public frontend & login/register remain completely free of role selectors.

export type UserRole = "super_admin" | "administrator" | "teacher" | "student" | "election_officer" | null;
export type UserStatus = "active" | "pending_role" | "rejected";

export interface SystemUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string; // Plain/hashed comparison
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  roleAssignedAt?: string;
  roleAssignedBy?: string;
}

const STORAGE_USERS_KEY = "himvote_institutional_users_v2";
const STORAGE_CURRENT_USER_KEY = "himvote_current_authenticated_user_v2";

const INITIAL_USERS: SystemUser[] = [
  {
    id: "usr_superadmin",
    fullName: "Super Administrator",
    email: "superadmin@hptu.ac.in",
    passwordHash: "Admin123!",
    role: "super_admin",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    roleAssignedAt: "2026-01-01T00:00:00.000Z",
    roleAssignedBy: "SYSTEM_GENESIS",
  },
  {
    id: "usr_admin",
    fullName: "Campus Administrator",
    email: "admin@hptu.ac.in",
    passwordHash: "Admin123!",
    role: "administrator",
    status: "active",
    createdAt: "2026-01-10T00:00:00.000Z",
    roleAssignedAt: "2026-01-10T00:00:00.000Z",
    roleAssignedBy: "usr_superadmin",
  },
  {
    id: "usr_officer",
    fullName: "Transparency & Election Officer",
    email: "officer@hptu.ac.in",
    passwordHash: "Officer123!",
    role: "election_officer",
    status: "active",
    createdAt: "2026-01-15T00:00:00.000Z",
    roleAssignedAt: "2026-01-15T00:00:00.000Z",
    roleAssignedBy: "usr_superadmin",
  },
  {
    id: "usr_teacher",
    fullName: "Prof. Rajesh Sharma",
    email: "teacher@hptu.ac.in",
    passwordHash: "Teacher123!",
    role: "teacher",
    status: "active",
    createdAt: "2026-02-01T00:00:00.000Z",
    roleAssignedAt: "2026-02-01T00:00:00.000Z",
    roleAssignedBy: "usr_superadmin",
  },
  {
    id: "usr_student",
    fullName: "Aarav Thakur",
    email: "student@hptu.ac.in",
    passwordHash: "Student123!",
    role: "student",
    status: "active",
    createdAt: "2026-02-15T00:00:00.000Z",
    roleAssignedAt: "2026-02-15T00:00:00.000Z",
    roleAssignedBy: "usr_superadmin",
  },
];

let inMemoryUsers: SystemUser[] = [...INITIAL_USERS];
let inMemoryCurrentUser: SystemUser | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadUsers(): SystemUser[] {
  if (!isBrowser()) return inMemoryUsers;
  try {
    const raw = window.localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return [...INITIAL_USERS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}
  return inMemoryUsers;
}

function saveUsers(users: SystemUser[]) {
  inMemoryUsers = users;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {}
}

function syncAuthCookies(user: SystemUser | null) {
  if (!isBrowser()) return;
  try {
    if (user && user.role) {
      const sessionData = {
        user_id: user.id,
        email: user.email,
        roles: [user.role],
        scopes: [{ role: user.role, scope_type: "global", scope_id: "*" }],
        mfa_authenticated: true,
      };
      const encoded = encodeURIComponent(JSON.stringify(sessionData));
      document.cookie = `session_id=session_${user.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `session=session_${user.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `himvote_session_profile=${encoded}; path=/; max-age=86400; SameSite=Lax`;
    } else {
      document.cookie = "session_id=; path=/; max-age=0";
      document.cookie = "session=; path=/; max-age=0";
      document.cookie = "himvote_session_profile=; path=/; max-age=0";
    }
  } catch {}
}

export const userAuthStore = {
  getUsers(): SystemUser[] {
    return loadUsers();
  },

  getUserByEmail(email: string): SystemUser | null {
    const clean = email.trim().toLowerCase();
    const users = loadUsers();
    return users.find((u) => u.email.toLowerCase() === clean) || null;
  },

  getUserById(id: string): SystemUser | null {
    const users = loadUsers();
    return users.find((u) => u.id === id) || null;
  },

  getCurrentUser(): SystemUser | null {
    if (!isBrowser()) return inMemoryCurrentUser;
    try {
      const raw = window.localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (raw) {
        const parsed: SystemUser = JSON.parse(raw);
        // Refresh with latest role from users db
        const latest = this.getUserById(parsed.id);
        if (latest) {
          if (latest.role !== parsed.role || latest.status !== parsed.status) {
            window.localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(latest));
            syncAuthCookies(latest);
          }
          return latest;
        }
        return parsed;
      }
    } catch {}
    return inMemoryCurrentUser;
  },

  registerUser(fullName: string, email: string, password: string): { user: SystemUser; success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) {
      throw new Error("Full legal name is required.");
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("A valid email address is required.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    const users = loadUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    // New registrations have NO role and are pending Super Admin assignment
    const newUser: SystemUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: cleanName,
      email: cleanEmail,
      passwordHash: password,
      role: null,
      status: "pending_role",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    return {
      user: newUser,
      success: true,
      message: "Registration successful. Your account is pending role assignment by the Super Administrator.",
    };
  },

  loginUser(email: string, password: string): { user: SystemUser; rolePath?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    if (user.passwordHash !== password) {
      throw new Error("Invalid email or password.");
    }

    // Save session
    inMemoryCurrentUser = user;
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
      } catch {}
    }
    syncAuthCookies(user);

    // If user has no role assigned yet:
    if (!user.role) {
      return { user };
    }

    // Resolve designated workspace path
    let rolePath = "/student";
    if (user.role === "super_admin") rolePath = "/super-admin";
    else if (user.role === "administrator") rolePath = "/admin";
    else if (user.role === "election_officer") rolePath = "/officer";
    else if (user.role === "teacher") rolePath = "/teacher";
    else if (user.role === "student") rolePath = "/student";

    return { user, rolePath };
  },

  logoutUser() {
    inMemoryCurrentUser = null;
    if (isBrowser()) {
      try {
        window.localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      } catch {}
    }
    syncAuthCookies(null);
  },

  // ONLY Super Admin can call and assign roles
  assignRole(
    userId: string,
    role: "administrator" | "teacher" | "student" | "election_officer" | "super_admin" | null,
    assignedBy = "Super Admin"
  ): SystemUser {
    const users = loadUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error("Target user could not be found.");
    }

    const current = users[index];
    const updated: SystemUser = {
      ...current,
      role: role,
      status: role ? "active" : "pending_role",
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: assignedBy,
    };

    users[index] = updated;
    saveUsers(users);

    // If currently logged in user was modified, sync session
    const currentLogged = this.getCurrentUser();
    if (currentLogged && currentLogged.id === userId) {
      inMemoryCurrentUser = updated;
      if (isBrowser()) {
        try {
          window.localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(updated));
        } catch {}
      }
      syncAuthCookies(updated);
    }

    return updated;
  },

  deleteUser(userId: string) {
    let users = loadUsers();
    users = users.filter((u) => u.id !== userId);
    saveUsers(users);
  },
};
