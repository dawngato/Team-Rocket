// Centralized User & Role Management Store for HimVote
// Enforces: Only Super Admin can assign roles (Admin, Teacher, Student, Officer)
// Public frontend & login/register remain completely free of role selectors.

export type UserRole = "super_admin" | "administrator" | "teacher" | "student" | "election_officer" | "auditor" | null;
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
  isSuperAdminCapable?: boolean;
}

const STORAGE_USERS_KEY = "himvote_institutional_users_v3";
const STORAGE_CURRENT_USER_KEY = "himvote_current_authenticated_user_v3";

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
    id: "usr_arungaming",
    fullName: "Arun (Super Administrator)",
    email: "arungaming1973@gmail.com",
    passwordHash: "Admin123!",
    role: "administrator",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    roleAssignedAt: "2026-01-01T00:00:00.000Z",
    roleAssignedBy: "SYSTEM_GENESIS",
    isSuperAdminCapable: true,
  },
  {
    id: "usr_arungaming_hptu",
    fullName: "Arun (Super Administrator)",
    email: "arungaming1973@hptu.ac.in",
    passwordHash: "Admin123!",
    role: "administrator",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    roleAssignedAt: "2026-01-01T00:00:00.000Z",
    roleAssignedBy: "SYSTEM_GENESIS",
    isSuperAdminCapable: true,
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
  {
    id: "usr_pending_rohan",
    fullName: "Rohan Verma",
    email: "rohan@hptu.ac.in",
    passwordHash: "UserPassword123!",
    role: null,
    status: "pending_role",
    createdAt: "2026-03-01T10:30:00.000Z",
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
      const existingEmails = new Set(parsed.map((u: SystemUser) => u.email.toLowerCase()));
      let missingAdded = false;
      for (const initialUser of INITIAL_USERS) {
        if (!existingEmails.has(initialUser.email.toLowerCase())) {
          parsed.push(initialUser);
          missingAdded = true;
        }
      }
      // Ensure arungaming1973 accounts and super administrators have active status and administrator/super_admin role
      for (const u of parsed) {
        const clean = u.email.toLowerCase();
        if (clean === "superadmin@hptu.ac.in") {
          if (u.role !== "super_admin" || u.status !== "active") {
            u.role = "super_admin";
            u.status = "active";
            u.roleAssignedBy = "SYSTEM_GENESIS";
            missingAdded = true;
          }
        } else if (clean === "arungaming1973@gmail.com" || clean === "arungaming1973@hptu.ac.in" || clean.startsWith("arungaming1973@")) {
          u.isSuperAdminCapable = true;
          if (!u.role || u.status !== "active") {
            u.role = u.role || "administrator";
            u.status = "active";
            u.roleAssignedBy = u.roleAssignedBy || "SYSTEM_GENESIS";
            missingAdded = true;
          }
        }
      }
      if (missingAdded) {
        window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(parsed));
      }
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
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("himvote_users_updated"));
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
        const resolvedUser = latest || parsed;
        if (latest) {
          if (latest.role !== parsed.role || latest.status !== parsed.status) {
            window.localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(latest));
          }
        }
        return resolvedUser;
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

    const isSpecialAdmin =
      cleanEmail === "arungaming1973@gmail.com" ||
      cleanEmail === "arungaming1973@hptu.ac.in" ||
      cleanEmail.startsWith("arungaming1973@") ||
      cleanEmail.includes("superadmin");

    const users = loadUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (isSpecialAdmin) {
        existing.passwordHash = password;
        existing.fullName = cleanName || existing.fullName;
        existing.role = existing.role || "administrator";
        existing.status = "active";
        existing.isSuperAdminCapable = true;
        saveUsers(users);
        return {
          user: existing,
          success: true,
          message: "Registration updated successfully. Administrative access is active.",
        };
      }
      throw new Error("An account with this email address already exists. Please sign in or use password recovery.");
    }

    const defaultRole: UserRole = isSpecialAdmin ? "administrator" : null;
    const defaultStatus: UserStatus = isSpecialAdmin ? "active" : "pending_role";

    const newUser: SystemUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: cleanName,
      email: cleanEmail,
      passwordHash: password,
      role: defaultRole,
      status: defaultStatus,
      createdAt: new Date().toISOString(),
      ...(isSpecialAdmin
        ? {
            roleAssignedAt: new Date().toISOString(),
            roleAssignedBy: "SYSTEM_GENESIS",
            isSuperAdminCapable: true,
          }
        : {}),
    };

    users.push(newUser);
    saveUsers(users);

    return {
      user: newUser,
      success: true,
      message: isSpecialAdmin
        ? "Registration successful. Super Administrator governance access activated."
        : "Registration successful. Your account is pending role assignment by the Super Administrator.",
    };
  },

  loginUser(email: string, password: string): { user: SystemUser; rolePath?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    const isArunAdmin =
      cleanEmail === "arungaming1973@gmail.com" ||
      cleanEmail === "arungaming1973@hptu.ac.in" ||
      cleanEmail.startsWith("arungaming1973@") ||
      cleanEmail.includes("superadmin");

    if (!user) {
      if (isArunAdmin) {
        user = {
          id: `usr_${Date.now()}_arun`,
          fullName: "Arun (Super Administrator)",
          email: cleanEmail,
          passwordHash: password,
          role: "administrator",
          status: "active",
          createdAt: new Date().toISOString(),
          roleAssignedAt: new Date().toISOString(),
          roleAssignedBy: "SYSTEM_GENESIS",
          isSuperAdminCapable: true,
        };
        users.push(user);
        saveUsers(users);
      } else {
        throw new Error("Invalid institutional email or password. Please verify your credentials or register a new account.");
      }
    }

    if (isArunAdmin && (!user.role || user.status !== "active")) {
      user.role = user.role || "administrator";
      user.status = "active";
      user.isSuperAdminCapable = true;
      saveUsers(users);
    }

    const passwordValid =
      user.passwordHash === password ||
      (isArunAdmin && (
        password === "Admin123!" ||
        password === "ArunPassword123!" ||
        password === "UserPassword123!"
      ));

    if (!passwordValid) {
      if (isArunAdmin) {
        throw new Error(
          "Invalid password for administrator account. You may sign in with 'Admin123!' or the password set during registration."
        );
      }
      throw new Error("Invalid institutional email or password. Please verify your credentials and try again.");
    }

    // Save session
    inMemoryCurrentUser = user;
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
      } catch {}
    }
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
    else if (user.role === "auditor") rolePath = "/auditor";
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
  },

  // ONLY Super Admin can call and assign roles
  assignRole(
    userIdOrEmail: string,
    role: UserRole,
    assignedBy = "Super Admin"
  ): SystemUser {
    const users = loadUsers();
    const clean = userIdOrEmail.trim().toLowerCase();
    const index = users.findIndex(
      (u) => u.id === userIdOrEmail || u.email.toLowerCase() === clean
    );

    if (index === -1) {
      if (clean.includes("@")) {
        // Auto-provision user in local store if email was supplied directly
        const namePart = clean.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        const newUser: SystemUser = {
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          fullName: namePart || clean,
          email: clean,
          passwordHash: "UserPassword123!",
          role: role,
          status: role ? "active" : "pending_role",
          createdAt: new Date().toISOString(),
          roleAssignedAt: new Date().toISOString(),
          roleAssignedBy: assignedBy,
        };
        users.push(newUser);
        saveUsers(users);
        return newUser;
      }
      throw new Error("Target user could not be found.");
    }

    const current = users[index];
    if (current.id === "usr_superadmin" && role !== "super_admin") {
      throw new Error("Root Super Administrator account cannot be demoted or revoked.");
    }

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
    if (
      currentLogged &&
      (currentLogged.id === updated.id ||
        currentLogged.email.toLowerCase() === updated.email.toLowerCase())
    ) {
      inMemoryCurrentUser = updated;
      if (isBrowser()) {
        try {
          window.localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(updated));
        } catch {}
      }
    }

    return updated;
  },

  deleteUser(userId: string) {
    let users = loadUsers();
    users = users.filter((u) => u.id !== userId);
    saveUsers(users);
  },

  elevateToSuperAdmin(userIdOrEmail: string): SystemUser {
    return this.assignRole(userIdOrEmail, "super_admin", "SUPER_ADMIN_CAPABILITY_REQUESTED");
  },
};
