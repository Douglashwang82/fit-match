import type {
  UserProfile,
  WorkoutHistory,
  PillarBasedPlan,
  PillarWorkoutHistory,
  PillarProgress,
  TrainingPillar,
  DailyEnergyLevel,
  WorkoutDifficulty,
  Intensity,
  PillarWorkoutRecord,
} from "./types";
import {
  saveProfileToBackend,
  savePillarPlanToBackend,
  confirmPillarPlanInBackend,
  saveWorkoutRecordToBackend,
} from "./api";

/**
 * Get local date string in YYYY-MM-DD format (consistent with backend).
 * Avoids timezone issues that occur with toISOString().
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const STORAGE_KEYS = {
  PROFILE: "syncmotion_profile",
  HISTORY: "syncmotion_history",
  // Pillar-based system
  PILLAR_PLAN: "syncmotion_pillar_plan",
  PILLAR_HISTORY: "syncmotion_pillar_history",
  // Persistent anonymous user ID
  USER_ID: "syncmotion_user_id",
} as const;

// ─── User Identity ────────────────────────────────────────────────────────────

/** Returns a stable anonymous user UUID, creating one on first call. */
export function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.USER_ID, id);
  }
  return id;
}

// Profile
export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  saveProfileToBackend(getUserId(), profile).catch(console.error);
}

export function getProfile(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

// History
export function getHistory(): WorkoutHistory {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (!data) {
    return {
      daysCompleted: [],
      currentStreak: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
      feedback: [],
    };
  }
  try {
    return JSON.parse(data) as WorkoutHistory;
  } catch {
    return {
      daysCompleted: [],
      currentStreak: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
      feedback: [],
    };
  }
}

export function saveHistory(history: WorkoutHistory): void {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export function recordWorkoutCompletion(
  completed: boolean,
  energyBefore: "low" | "medium" | "high",
  difficulty: "too_easy" | "just_right" | "too_hard",
  notes?: string
): void {
  const history = getHistory();
  const today = getLocalDateString();

  // Always add feedback
  history.feedback.push({
    date: today,
    energyBefore,
    completed,
    difficulty,
    notes,
  });

  if (completed) {
    // Check if we already recorded a workout today
    const alreadyCompletedToday = history.daysCompleted.includes(today);

    if (!alreadyCompletedToday) {
      history.daysCompleted.push(today);
      history.totalWorkouts += 1;

      // Calculate streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      if (history.lastWorkoutDate === yesterdayStr) {
        // Consecutive day - increment streak
        history.currentStreak += 1;
      } else if (history.lastWorkoutDate !== today) {
        // Not consecutive and not already today - reset streak
        history.currentStreak = 1;
      }
      // If lastWorkoutDate === today, streak stays the same (shouldn't happen due to alreadyCompletedToday check)

      history.lastWorkoutDate = today;
    }
    // If already completed today, don't modify streak or totalWorkouts
  }

  saveHistory(history);
}

// Clear all
export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  // Clear pillar data
  localStorage.removeItem(STORAGE_KEYS.PILLAR_PLAN);
  localStorage.removeItem(STORAGE_KEYS.PILLAR_HISTORY);
}

// Check if user has completed profile setup
export function hasCompletedSetup(): boolean {
  const profile = getProfile();
  const pillarPlan = getPillarPlan();
  return profile !== null && pillarPlan !== null && pillarPlan.confirmed;
}


// ─── Pillar-Based Training System ───────────────────────────────────────────

// Pillar Plan Storage
export function savePillarPlan(plan: PillarBasedPlan): void {
  localStorage.setItem(STORAGE_KEYS.PILLAR_PLAN, JSON.stringify(plan));
  savePillarPlanToBackend(getUserId(), plan).catch(console.error);
}

export function getPillarPlan(): PillarBasedPlan | null {
  const data = localStorage.getItem(STORAGE_KEYS.PILLAR_PLAN);
  if (!data) return null;
  try {
    return JSON.parse(data) as PillarBasedPlan;
  } catch {
    return null;
  }
}

export function confirmPillarPlan(): void {
  const plan = getPillarPlan();
  if (plan) {
    plan.confirmed = true;
    savePillarPlan(plan);
    confirmPillarPlanInBackend(getUserId()).catch(console.error);
  }
}

// Pillar History Storage
export function getPillarHistory(): PillarWorkoutHistory {
  const data = localStorage.getItem(STORAGE_KEYS.PILLAR_HISTORY);
  if (!data) {
    return {
      pillarRecords: [],
      currentStreak: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
    };
  }
  try {
    return JSON.parse(data) as PillarWorkoutHistory;
  } catch {
    return {
      pillarRecords: [],
      currentStreak: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
    };
  }
}

export function savePillarHistory(history: PillarWorkoutHistory): void {
  localStorage.setItem(STORAGE_KEYS.PILLAR_HISTORY, JSON.stringify(history));
}

export function recordPillarWorkoutCompletion(
  pillarId: string,
  duration: number,
  energyBefore: DailyEnergyLevel,
  difficulty: WorkoutDifficulty,
  completed: boolean = true
): void {
  const history = getPillarHistory();
  const today = getLocalDateString();

  // Sync individual record to backend
  const record: PillarWorkoutRecord = {
    date: today,
    pillarId,
    duration,
    difficulty,
    energyBefore,
    completed,
  };
  saveWorkoutRecordToBackend(getUserId(), record).catch(console.error);

  // Add pillar record
  history.pillarRecords.push({
    date: today,
    pillarId,
    duration,
    difficulty,
    energyBefore,
    completed,
  });

  // Trim to keep only last 30 days of records
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = getLocalDateString(thirtyDaysAgo);
  history.pillarRecords = history.pillarRecords.filter(
    (r) => r.date >= cutoffDate
  );

  if (completed) {
    // Check if already completed a workout today
    const todayRecords = history.pillarRecords.filter(
      (r) => r.date === today && r.completed
    );

    // Only update streak/total if this is the first workout today
    if (todayRecords.length === 1) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      if (history.lastWorkoutDate === yesterdayStr) {
        history.currentStreak += 1;
      } else if (history.lastWorkoutDate !== today) {
        history.currentStreak = 1;
      }

      history.totalWorkouts += 1;
      history.lastWorkoutDate = today;
    }
  }

  savePillarHistory(history);
}

// Calculate pillar progress for UI display
export function calculatePillarProgress(
  pillars: TrainingPillar[],
  history: PillarWorkoutHistory,
  rollingWindowDays: number = 7
): PillarProgress[] {
  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - rollingWindowDays);
  const windowStartStr = getLocalDateString(windowStart);

  return pillars
    .map((pillar) => {
      // Filter records for this pillar within window
      const pillarRecords = history.pillarRecords.filter(
        (r) =>
          r.pillarId === pillar.id &&
          r.date >= windowStartStr &&
          r.completed
      );

      const completionsInWindow = pillarRecords.length;
      const completionPercentage = Math.min(
        100,
        pillar.targetFrequency > 0
          ? (completionsInWindow / pillar.targetFrequency) * 100
          : 100
      );

      // Find last trained date for this pillar
      const sortedRecords = [...history.pillarRecords]
        .filter((r) => r.pillarId === pillar.id && r.completed)
        .sort((a, b) => b.date.localeCompare(a.date));
      const lastTrainedDate = sortedRecords[0]?.date ?? null;

      // Calculate days since last
      let daysSinceLast = rollingWindowDays;
      if (lastTrainedDate) {
        const lastDate = new Date(lastTrainedDate);
        daysSinceLast = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Determine recommended intensity
      const recentDifficulty = sortedRecords[0]?.difficulty;
      let recommendedIntensity: Intensity = pillar.defaultIntensity;
      if (daysSinceLast > 5) {
        recommendedIntensity = "low";
      } else if (recentDifficulty === "too_hard") {
        recommendedIntensity = "low";
      } else if (recentDifficulty === "too_easy") {
        recommendedIntensity = "high";
      }

      // Calculate priority score
      const gap = pillar.targetFrequency - completionsInWindow;
      let priorityScore = gap * 100 + Math.min(daysSinceLast, 7) * 10;
      if (recentDifficulty === "too_easy") {
        priorityScore += 10;
      }
      if (recentDifficulty === "too_hard" && daysSinceLast < 3) {
        priorityScore -= 50;
      }

      // Days until this pillar becomes "stale"
      const daysUntilStale = Math.max(0, rollingWindowDays - daysSinceLast);

      return {
        pillar,
        completionsInWindow,
        completionPercentage,
        lastTrainedDate,
        daysSinceLast,
        recommendedIntensity,
        priorityScore,
        daysUntilStale,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

// Clear all pillar data
export function clearPillarData(): void {
  localStorage.removeItem(STORAGE_KEYS.PILLAR_PLAN);
  localStorage.removeItem(STORAGE_KEYS.PILLAR_HISTORY);
}
