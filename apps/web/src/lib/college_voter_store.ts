// College Election Config Store - Reactive client-side store for Admin-controlled election parameters
// Controls: Total Students, Election End Time (Countdown), and Total Candidates contesting

const STUDENTS_KEY = "himvote_total_college_students";
const END_TIME_KEY = "himvote_election_end_time";
const CANDIDATES_KEY = "himvote_election_candidates_count";

const DEFAULT_TOTAL_STUDENTS = 4800;
const DEFAULT_CANDIDATES = 6;

// Default end time: today at 5:00 PM or 4 hours from now
export function getDefaultEndTime(): string {
  const d = new Date();
  d.setHours(17, 0, 0, 0); // 5:00 PM
  if (d.getTime() <= Date.now()) {
    d.setTime(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
  }
  return d.toISOString();
}

export interface ElectionConfig {
  totalStudents: number;
  endTimeIso: string;
  candidatesCount: number;
}

export function getStoredElectionConfig(): ElectionConfig {
  if (typeof window === "undefined") {
    return {
      totalStudents: DEFAULT_TOTAL_STUDENTS,
      endTimeIso: getDefaultEndTime(),
      candidatesCount: DEFAULT_CANDIDATES,
    };
  }

  try {
    const studentsVal = localStorage.getItem(STUDENTS_KEY);
    const parsedStudents = studentsVal ? parseInt(studentsVal, 10) : NaN;
    const totalStudents = isNaN(parsedStudents) || parsedStudents <= 0 ? DEFAULT_TOTAL_STUDENTS : parsedStudents;

    const storedEndTime = localStorage.getItem(END_TIME_KEY);
    const endTimeIso = storedEndTime && !isNaN(new Date(storedEndTime).getTime()) ? storedEndTime : getDefaultEndTime();

    const candidatesVal = localStorage.getItem(CANDIDATES_KEY);
    const parsedCandidates = candidatesVal ? parseInt(candidatesVal, 10) : NaN;
    const candidatesCount = isNaN(parsedCandidates) || parsedCandidates <= 0 ? DEFAULT_CANDIDATES : parsedCandidates;

    return {
      totalStudents,
      endTimeIso,
      candidatesCount,
    };
  } catch {
    return {
      totalStudents: DEFAULT_TOTAL_STUDENTS,
      endTimeIso: getDefaultEndTime(),
      candidatesCount: DEFAULT_CANDIDATES,
    };
  }
}

export function setStoredElectionConfig(config: Partial<ElectionConfig>): void {
  if (typeof window === "undefined") return;
  try {
    if (config.totalStudents !== undefined) {
      localStorage.setItem(STUDENTS_KEY, String(config.totalStudents));
    }
    if (config.endTimeIso !== undefined) {
      localStorage.setItem(END_TIME_KEY, config.endTimeIso);
    }
    if (config.candidatesCount !== undefined) {
      localStorage.setItem(CANDIDATES_KEY, String(config.candidatesCount));
    }

    window.dispatchEvent(new CustomEvent("himvote_election_config_updated", { detail: config }));
  } catch (err) {
    console.error("Failed to persist election config", err);
  }
}

// Backward compatibility helpers
export function getStoredTotalStudents(): number {
  return getStoredElectionConfig().totalStudents;
}

export function setStoredTotalStudents(count: number): void {
  setStoredElectionConfig({ totalStudents: count });
}
