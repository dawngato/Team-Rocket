import { describe, expect, it } from "vitest";
import { groupStudentsByDepartment } from "../src/lib/teacher_rosters";
import type { StudentRecord } from "../src/lib/types";

const student = (overrides: Partial<StudentRecord>): StudentRecord => ({
  id: "profile-1",
  student_id: "STU-1",
  full_name: "Student One",
  email: "one@example.test",
  department: "Computer Science",
  verified: false,
  status: "PENDING_VERIFICATION",
  created_at_utc: "2026-10-31T00:00:00Z",
  ...overrides,
});

describe("teacher roster grouping", () => {
  it("groups only server returned records and computes status counts", () => {
    const rosters = groupStudentsByDepartment([
      student({ id: "1", student_id: "STU-2", full_name: "Zara Student", status: "VERIFIED", verified: true }),
      student({ id: "2", student_id: "STU-1", full_name: "Ari Student" }),
      student({ id: "3", student_id: "STU-3", full_name: "Mei Student", department: "Electronics", status: "VERIFIED", verified: true }),
    ]);

    expect(rosters.map((roster) => roster.department)).toEqual(["Computer Science", "Electronics"]);
    expect(rosters[0]).toMatchObject({ students: expect.any(Array), verified_count: 1, pending_count: 1 });
    expect(rosters[0].students.map((record) => record.full_name)).toEqual(["Ari Student", "Zara Student"]);
  });

  it("uses an explicit unassigned bucket for missing department scope", () => {
    const [roster] = groupStudentsByDepartment([student({ department: "   " })]);
    expect(roster.department).toBe("Unassigned department");
    expect(roster.id).toBe("department:unassigned-department");
  });

  it("returns no fabricated sections for an empty server response", () => {
    expect(groupStudentsByDepartment([])).toEqual([]);
  });
});
