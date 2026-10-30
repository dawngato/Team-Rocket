// College Voter Store - Centralized reactive store for Total College Students
// Allows Admin to update total college strength, which synchronizes across Home page & Admin

const STORAGE_KEY = "himvote_total_college_students";
const DEFAULT_TOTAL_STUDENTS = 4800;

export function getStoredTotalStudents(): number {
  if (typeof window === "undefined") return DEFAULT_TOTAL_STUDENTS;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return DEFAULT_TOTAL_STUDENTS;
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? DEFAULT_TOTAL_STUDENTS : num;
  } catch {
    return DEFAULT_TOTAL_STUDENTS;
  }
}

export function setStoredTotalStudents(count: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(count));
    // Dispatch custom event so other components on same page or tabs react instantly
    window.dispatchEvent(new CustomEvent("himvote_total_students_updated", { detail: { count } }));
  } catch (err) {
    console.error("Failed to persist total students count", err);
  }
}
