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
});
