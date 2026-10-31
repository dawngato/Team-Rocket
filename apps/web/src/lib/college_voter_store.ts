// College Election Config Store - Reactive client-side store for Admin-controlled election parameters
// Controls: Total Students, Actual Cast Votes, Election End Time (Countdown), and Candidates contesting

const STUDENTS_KEY = "himvote_total_college_students";
const VOTES_CAST_KEY = "himvote_actual_votes_cast";
const END_TIME_KEY = "himvote_election_end_time";
const CANDIDATES_KEY = "himvote_election_candidates_count";

const DEFAULT_TOTAL_STUDENTS = 4800;
const DEFAULT_VOTES_CAST = 3412;
const DEFAULT_CANDIDATES = 6;

// Target default: Upcoming Sunday at 5:00 PM (17:00:00)
export function getDefaultEndTime(): string {
  const now = new Date();
  // In JavaScript: Sunday is 0, Monday is 1 ... Saturday is 6
  const currentDay = now.getDay();
  let daysUntilSunday = (7 - currentDay) % 7;
  
  const targetSunday = new Date(now);
  targetSunday.setDate(now.getDate() + daysUntilSunday);
  targetSunday.setHours(17, 0, 0, 0); // 5:00 PM

  // If today is Sunday and it is already past 5:00 PM, target next Sunday
  if (targetSunday.getTime() <= now.getTime()) {
    targetSunday.setDate(targetSunday.getDate() + 7);
  }

  return targetSunday.toISOString();
}

export interface ElectionConfig {
  totalStudents: number;
  votesCast: number;
  endTimeIso: string;
  candidatesCount: number;
}

export function getStoredElectionConfig(): ElectionConfig {
  if (typeof window === "undefined") {
    return {
      totalStudents: DEFAULT_TOTAL_STUDENTS,
      votesCast: DEFAULT_VOTES_CAST,
      endTimeIso: getDefaultEndTime(),
      candidatesCount: DEFAULT_CANDIDATES,
    };
  }

  try {
    const studentsVal = localStorage.getItem(STUDENTS_KEY);
    const parsedStudents = studentsVal ? parseInt(studentsVal, 10) : NaN;
    const totalStudents = isNaN(parsedStudents) || parsedStudents <= 0 ? DEFAULT_TOTAL_STUDENTS : parsedStudents;

    const votesVal = localStorage.getItem(VOTES_CAST_KEY);
    const parsedVotes = votesVal ? parseInt(votesVal, 10) : NaN;
    const votesCast = isNaN(parsedVotes) || parsedVotes < 0 ? DEFAULT_VOTES_CAST : parsedVotes;

    const storedEndTime = localStorage.getItem(END_TIME_KEY);
    const endTimeIso = storedEndTime && !isNaN(new Date(storedEndTime).getTime()) ? storedEndTime : getDefaultEndTime();

    const candidatesVal = localStorage.getItem(CANDIDATES_KEY);
    const parsedCandidates = candidatesVal ? parseInt(candidatesVal, 10) : NaN;
    const candidatesCount = isNaN(parsedCandidates) || parsedCandidates <= 0 ? DEFAULT_CANDIDATES : parsedCandidates;

    return {
      totalStudents,
      votesCast,
      endTimeIso,
      candidatesCount,
    };
  } catch {
    return {
      totalStudents: DEFAULT_TOTAL_STUDENTS,
      votesCast: DEFAULT_VOTES_CAST,
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
    if (config.votesCast !== undefined) {
      localStorage.setItem(VOTES_CAST_KEY, String(config.votesCast));
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

// Function to record an authentic vote cast from a student
export function recordAuthenticVote(ballotId?: string): number {
  const current = getStoredElectionConfig();
  const nextVotes = current.votesCast + 1;
  setStoredElectionConfig({ votesCast: nextVotes });

  // Dispatch event for UI celebration / real ballot badge
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("himvote_ballot_cast_event", {
        detail: {
          ballotNumber: nextVotes,
          ballotId: ballotId || `BAL-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  return nextVotes;
}

// Backward compatibility helpers
export function getStoredTotalStudents(): number {
  return getStoredElectionConfig().totalStudents;
}

export function setStoredTotalStudents(count: number): void {
  setStoredElectionConfig({ totalStudents: count });
}
