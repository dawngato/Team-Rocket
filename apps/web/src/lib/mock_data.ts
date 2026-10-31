/**
 * Test-only invariants used by the Vitest suite.
 *
 * Production routes must use service responses and must not import this file.
 */

export const INITIAL_ADMINISTRATORS = [
  {
    role: "SUPER_ADMINISTRATOR",
    email: "superadmin@hptu.ac.in",
    mfa_enabled: true,
    invited_by: "SYSTEM_BOOTSTRAP_INVITATION",
  },
];

export const INITIAL_DEPARTMENTS = [
  { verification_threshold_percent: 100, faculty_count: 1, student_count: 1 },
  { verification_threshold_percent: 100, faculty_count: 1, student_count: 1 },
  { verification_threshold_percent: 100, faculty_count: 1, student_count: 1 },
];

export const INITIAL_ROLE_REQUESTS = [
  { status: "APPROVED", dual_control_approver: "independent-approver" },
];

export const INITIAL_ASSIGNMENTS = [
  { faculty_id: "FAC_TEST", election_id: "elec_test" },
];

export const INITIAL_TRUSTED_PINS = [
  { service: "WITNESS" },
  { service: "CHAIN" },
  { service: "IDENTITY" },
];

export const INITIAL_INSTITUTIONS: unknown[] = [];
export const INITIAL_POLICIES: unknown[] = [];
export const INITIAL_ELECTIONS: unknown[] = [];
export const INITIAL_STUDENTS: unknown[] = [];
export const INITIAL_TEACHERS: unknown[] = [];
