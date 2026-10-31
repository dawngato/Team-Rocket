import { describe, expect, it, beforeEach } from "vitest";
import { userAuthStore } from "../src/lib/user_auth_store";
import { workspaceHome } from "../src/lib/routes/nav_config";

describe("User Registration, Authentication, and Super Admin Role Assignment", () => {
  beforeEach(() => {
    userAuthStore.logoutUser();
  });

  it("allows normal user registration with no role assigned by default", () => {
    const email = `testuser_${Date.now()}@hptu.ac.in`;
    const res = userAuthStore.registerUser("Pooja Verma", email, "SecurePass123!");

    expect(res.success).toBe(true);
    expect(res.user.fullName).toBe("Pooja Verma");
    expect(res.user.email).toBe(email);
    expect(res.user.role).toBeNull();
    expect(res.user.status).toBe("pending_role");
  });

  it("prevents duplicate registration with the same email", () => {
    const email = `duplicate_${Date.now()}@hptu.ac.in`;
    userAuthStore.registerUser("Original User", email, "Password123!");

    expect(() => {
      userAuthStore.registerUser("Duplicate User", email, "Password123!");
    }).toThrow("An account with this email address already exists.");
  });

  it("allows login but provides no rolePath for pending users", () => {
    const email = `pending_${Date.now()}@hptu.ac.in`;
    userAuthStore.registerUser("Pending Voter", email, "VoterPass123!");

    const loginRes = userAuthStore.loginUser(email, "VoterPass123!");
    expect(loginRes.user.email).toBe(email);
    expect(loginRes.user.role).toBeNull();
    expect(loginRes.rolePath).toBeUndefined();
  });

  it("allows Super Admin to assign roles to users", () => {
    const email = `candidate_${Date.now()}@hptu.ac.in`;
    const reg = userAuthStore.registerUser("Suresh Kumar", email, "PassWord123!");

    // Super Admin assigns Administrator role
    const adminUser = userAuthStore.assignRole(reg.user.id, "administrator", "Super Admin");
    expect(adminUser.role).toBe("administrator");
    expect(adminUser.status).toBe("active");
    expect(adminUser.roleAssignedBy).toBe("Super Admin");

    // When this admin logs in, they get the admin role path
    const loginAdmin = userAuthStore.loginUser(email, "PassWord123!");
    expect(loginAdmin.rolePath).toBe("/admin");

    // Super Admin changes role to Officer (Transparency)
    const officerUser = userAuthStore.assignRole(reg.user.id, "election_officer", "Super Admin");
    expect(officerUser.role).toBe("election_officer");
    const loginOfficer = userAuthStore.loginUser(email, "PassWord123!");
    expect(loginOfficer.rolePath).toBe("/officer");

    // Super Admin changes role to Teacher
    const teacherUser = userAuthStore.assignRole(reg.user.id, "teacher", "Super Admin");
    expect(teacherUser.role).toBe("teacher");
    const loginTeacher = userAuthStore.loginUser(email, "PassWord123!");
    expect(loginTeacher.rolePath).toBe("/teacher");

    // Super Admin changes role to Student
    const studentUser = userAuthStore.assignRole(reg.user.id, "student", "Super Admin");
    expect(studentUser.role).toBe("student");
    const loginStudent = userAuthStore.loginUser(email, "PassWord123!");
    expect(loginStudent.rolePath).toBe("/student");
  });

  it("allows Super Admin to revoke a role back to null (pending)", () => {
    const email = `revoke_${Date.now()}@hptu.ac.in`;
    const reg = userAuthStore.registerUser("Revoke Target", email, "PassWord123!");

    userAuthStore.assignRole(reg.user.id, "student", "Super Admin");
    expect(userAuthStore.getUserById(reg.user.id)?.role).toBe("student");

    // Revoke
    const revoked = userAuthStore.assignRole(reg.user.id, null, "Super Admin");
    expect(revoked.role).toBeNull();
    expect(revoked.status).toBe("pending_role");
  });

  it("has seeded default Super Admin credentials", () => {
    const superAdmin = userAuthStore.getUserByEmail("superadmin@hptu.ac.in");
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.role).toBe("super_admin");
    expect(superAdmin?.status).toBe("active");

    const loginRes = userAuthStore.loginUser("superadmin@hptu.ac.in", "Admin123!");
    expect(loginRes.user.role).toBe("super_admin");
    expect(loginRes.rolePath).toBe("/super-admin");
    expect(workspaceHome(["super_admin"])).toBe("/super-admin");
  });

  it("seeds arungaming1973@gmail.com with administrator role and supports both Admin123! and UserPassword123!", () => {
    const arun = userAuthStore.getUserByEmail("arungaming1973@gmail.com");
    expect(arun).toBeDefined();
    expect(arun?.role).toBe("administrator");
    expect(arun?.status).toBe("active");
    expect(arun?.isSuperAdminCapable).toBe(true);

    // Login with Admin123!
    const loginRes1 = userAuthStore.loginUser("arungaming1973@gmail.com", "Admin123!");
    expect(loginRes1.user.role).toBe("administrator");
    expect(loginRes1.rolePath).toBe("/admin");

    // Login with UserPassword123!
    const loginRes2 = userAuthStore.loginUser("arungaming1973@gmail.com", "UserPassword123!");
    expect(loginRes2.user.role).toBe("administrator");
    expect(loginRes2.rolePath).toBe("/admin");

    // Can elevate to super_admin if requested
    const elevated = userAuthStore.elevateToSuperAdmin("arungaming1973@gmail.com");
    expect(elevated.role).toBe("super_admin");
    const loginElevated = userAuthStore.loginUser("arungaming1973@gmail.com", "Admin123!");
    expect(loginElevated.rolePath).toBe("/super-admin");
  });

  it("defaults role to administrator when registering arungaming1973@gmail.com or superadmin email", () => {
    const regSuper = userAuthStore.registerUser("Campus Super", "new_superadmin@hptu.ac.in", "PassWord123!");
    expect(regSuper.user.role).toBe("administrator");
    expect(regSuper.user.status).toBe("active");
  });

  it("allows assigning roles by email address directly", () => {
    const email = `email_assign_${Date.now()}@hptu.ac.in`;
    userAuthStore.registerUser("Email Assignee", email, "Password123!");

    // Assign by email
    const updated = userAuthStore.assignRole(email, "election_officer", "Super Admin");
    expect(updated.email).toBe(email);
    expect(updated.role).toBe("election_officer");
    expect(updated.status).toBe("active");

    const check = userAuthStore.getUserByEmail(email);
    expect(check?.role).toBe("election_officer");
  });

  it("supports assigning and logging in with the auditor role", () => {
    const email = `auditor_${Date.now()}@hptu.ac.in`;
    const reg = userAuthStore.registerUser("Auditor Officer", email, "AuditorPass123!");

    const updated = userAuthStore.assignRole(reg.user.id, "auditor", "Super Admin");
    expect(updated.role).toBe("auditor");
    expect(updated.status).toBe("active");

    const loginRes = userAuthStore.loginUser(email, "AuditorPass123!");
    expect(loginRes.rolePath).toBe("/auditor");
  });

  it("auto-provisions unseen email when assigned role directly", () => {
    const newEmail = `direct_new_${Date.now()}@hptu.ac.in`;
    const assigned = userAuthStore.assignRole(newEmail, "teacher", "Super Admin");

    expect(assigned.email).toBe(newEmail);
    expect(assigned.role).toBe("teacher");
    expect(assigned.status).toBe("active");

    const fetched = userAuthStore.getUserByEmail(newEmail);
    expect(fetched).toBeDefined();
    expect(fetched?.role).toBe("teacher");
  });

  it("protects root superadmin from demotion or role revocation", () => {
    expect(() => {
      userAuthStore.assignRole("usr_superadmin", null, "Attacker");
    }).toThrow("Root Super Administrator account cannot be demoted or revoked.");

    expect(() => {
      userAuthStore.assignRole("superadmin@hptu.ac.in", "student", "Attacker");
    }).toThrow("Root Super Administrator account cannot be demoted or revoked.");
  });
});
