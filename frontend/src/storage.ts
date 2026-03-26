import type {
  UserProfile,
  WorkoutHistory,
  TrainingPlan,
  DailyWorkout,
  PillarBasedPlan,
  PillarWorkoutHistory,
  PillarProgress,
  TrainingPillar,
  DailyEnergyLevel,
  WorkoutDifficulty,
  Intensity,
} from "./types";

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
  PLAN: "syncmotion_plan",
  TODAY_WORKOUT: "syncmotion_today_workout",
  COMPLETED_PLAN_DAYS: "syncmotion_completed_plan_days",
  // Pillar-based system
  PILLAR_PLAN: "syncmotion_pillar_plan",
  PILLAR_HISTORY: "syncmotion_pillar_history",
} as const;

// Profile
export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
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

// Plan
export function savePlan(plan: TrainingPlan): void {
  localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
}

export function getPlan(): TrainingPlan | null {
  const data = localStorage.getItem(STORAGE_KEYS.PLAN);
  if (!data) return null;
  try {
    return JSON.parse(data) as TrainingPlan;
  } catch {
    return null;
  }
}

export function confirmPlan(): void {
  const plan = getPlan();
  if (plan) {
    plan.confirmed = true;
    savePlan(plan);
  }
}

// Today's Workout
export function saveTodayWorkout(workout: DailyWorkout): void {
  localStorage.setItem(STORAGE_KEYS.TODAY_WORKOUT, JSON.stringify(workout));
}

export function getTodayWorkout(): DailyWorkout | null {
  const data = localStorage.getItem(STORAGE_KEYS.TODAY_WORKOUT);
  if (!data) return null;
  try {
    const workout = JSON.parse(data) as DailyWorkout;
    // Check if the workout is from today (using local date)
    const today = getLocalDateString();
    if (workout.date === today) {
      return workout;
    }
    // Workout is from a previous day, clear it
    clearTodayWorkout();
    return null;
  } catch {
    return null;
  }
}

export function clearTodayWorkout(): void {
  localStorage.removeItem(STORAGE_KEYS.TODAY_WORKOUT);
}

// Completed Plan Days (for checklist feature)
interface CompletedPlanDays {
  weekStart: string; // ISO date of week start
  completedDays: number[]; // Array of day numbers (1-7)
}

export function getCompletedPlanDays(): CompletedPlanDays {
  const data = localStorage.getItem(STORAGE_KEYS.COMPLETED_PLAN_DAYS);
  const weekStart = getWeekStartDate();

  if (!data) {
    return { weekStart, completedDays: [] };
  }

  try {
    const stored = JSON.parse(data) as CompletedPlanDays;
    // Reset if it's a new week
    if (stored.weekStart !== weekStart) {
      return { weekStart, completedDays: [] };
    }
    return stored;
  } catch {
    return { weekStart, completedDays: [] };
  }
}

export function togglePlanDayCompletion(dayNumber: number): boolean {
  const current = getCompletedPlanDays();
  const isCompleted = current.completedDays.includes(dayNumber);

  if (isCompleted) {
    current.completedDays = current.completedDays.filter(d => d !== dayNumber);
  } else {
    current.completedDays.push(dayNumber);
  }

  localStorage.setItem(STORAGE_KEYS.COMPLETED_PLAN_DAYS, JSON.stringify(current));
  return !isCompleted; // Return new state
}

export function isPlanDayCompleted(dayNumber: number): boolean {
  const current = getCompletedPlanDays();
  return current.completedDays.includes(dayNumber);
}

function getWeekStartDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start of week
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return getLocalDateString(monday);
}

// Clear all
export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.PLAN);
  localStorage.removeItem(STORAGE_KEYS.TODAY_WORKOUT);
  localStorage.removeItem(STORAGE_KEYS.COMPLETED_PLAN_DAYS);
  // Clear pillar data
  localStorage.removeItem(STORAGE_KEYS.PILLAR_PLAN);
  localStorage.removeItem(STORAGE_KEYS.PILLAR_HISTORY);
}

// Check if user has completed profile setup
export function hasCompletedSetup(): boolean {
  const profile = getProfile();
  const plan = getPlan();
  const pillarPlan = getPillarPlan();
  // Support both legacy and pillar-based plans
  return profile !== null && (
    (plan !== null && plan.confirmed) ||
    (pillarPlan !== null && pillarPlan.confirmed)
  );
}


// ─── Pillar-Based Training System ───────────────────────────────────────────

// Pillar Plan Storage
export function savePillarPlan(plan: PillarBasedPlan): void {
  localStorage.setItem(STORAGE_KEYS.PILLAR_PLAN, JSON.stringify(plan));
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

// Migration helper for legacy plans
export function migrateToV2Plan(): void {
  const legacyHistory = getHistory();
  const pillarHistory = getPillarHistory();

  // If legacy history has data but pillar history is empty, migrate stats
  if (
    legacyHistory.totalWorkouts > 0 &&
    pillarHistory.pillarRecords.length === 0
  ) {
    // Preserve streak and total workouts
    pillarHistory.currentStreak = legacyHistory.currentStreak;
    pillarHistory.totalWorkouts = legacyHistory.totalWorkouts;
    pillarHistory.lastWorkoutDate = legacyHistory.lastWorkoutDate;
    savePillarHistory(pillarHistory);
    console.log("Migrated legacy workout stats to pillar system");
  }
}

// Clear all pillar data
export function clearPillarData(): void {
  localStorage.removeItem(STORAGE_KEYS.PILLAR_PLAN);
  localStorage.removeItem(STORAGE_KEYS.PILLAR_HISTORY);
}
