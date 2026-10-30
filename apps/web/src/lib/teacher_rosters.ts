import type { StudentRecord } from "./types";

export interface DepartmentRoster {
  id: string;
  department: string;
  students: StudentRecord[];
  verified_count: number;
  pending_count: number;
}

function departmentLabel(value: string): string {
  const normalized = value.trim();
  return normalized || "Unassigned department";
}

function departmentId(value: string): string {
  return `department:${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unassigned"}`;
}

/**
 * Build teacher-visible roster sections from records already scoped by the
 * identity service. This deliberately does not invent course IDs or counts.
 */
export function groupStudentsByDepartment(students: StudentRecord[]): DepartmentRoster[] {
  const groups = new Map<string, StudentRecord[]>();

  for (const student of students) {
    const department = departmentLabel(student.department);
    const current = groups.get(department) ?? [];
    current.push(student);
    groups.set(department, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([department, records]) => {
      const verified_count = records.filter((student) => student.status === "VERIFIED" || student.verified).length;
      return {
        id: departmentId(department),
        department,
        students: [...records].sort((left, right) => left.full_name.localeCompare(right.full_name)),
        verified_count,
        pending_count: records.length - verified_count,
      };
    });
}
