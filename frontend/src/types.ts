export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds: number;
  notes?: string;
}

// User Profile Types
export type Gender = "male" | "female" | "other";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type WorkSchedule = "morning" | "afternoon" | "evening" | "flexible";
export type DietType = "standard" | "vegetarian" | "vegan" | "keto" | "other";

export interface UserProfile {
  // Body
  age: number;
  gender: Gender;
  weight: number; // kg
  height: number; // cm
  fitnessLevel: FitnessLevel;
  injuries: string[];

  // Habits - Exercise
  currentFrequency: number; // days per week currently exercising
  preferredExercises: string[];

  // Habits - Lifestyle
  sleepHours: number;
  workSchedule: WorkSchedule;
  dietType: DietType;

  // Goal
  goal: string;
  targetDaysPerWeek: number;
}

// Workout History Types
export type DailyEnergyLevel = "low" | "medium" | "high";
export type WorkoutDifficulty = "too_easy" | "just_right" | "too_hard";

export interface DailyFeedback {
  date: string;
  energyBefore: DailyEnergyLevel;
  completed: boolean;
  difficulty: WorkoutDifficulty;
  notes?: string;
}

export interface WorkoutHistory {
  daysCompleted: string[]; // ISO date strings
  currentStreak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
  feedback: DailyFeedback[];
}

// Training Plan Types
export type Intensity = "low" | "medium" | "high";

// App Flow
export type AppView =
  | "profile-setup"
  | "plan-review"
  | "dashboard";


// ─── Pillar-Based Training System Types ─────────────────────────────────────

export interface TrainingPillar {
  id: string;
  name: string;  // Traditional Chinese
  description: string;  // Traditional Chinese
  targetFrequency: number;  // times per rolling window (1-7)
  exampleExercises: string[];  // Traditional Chinese
  defaultDuration: number;  // minutes
  defaultIntensity: Intensity;
}

export interface PillarBasedPlan {
  id: string;
  createdAt: string;
  pillars: TrainingPillar[];
  planSummary: string;  // Traditional Chinese
  weeklyGoal: string;  // Traditional Chinese
  rollingWindowDays: number;  // 7 or 14
  confirmed: boolean;
}

export interface PillarWorkoutRecord {
  date: string;  // ISO date
  pillarId: string;
  duration: number;  // minutes
  difficulty: WorkoutDifficulty;
  energyBefore: DailyEnergyLevel;
  completed: boolean;
}

export interface PillarWorkoutHistory {
  pillarRecords: PillarWorkoutRecord[];
  currentStreak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
}

export interface PillarProgress {
  pillar: TrainingPillar;
  completionsInWindow: number;
  completionPercentage: number;  // 0-100
  lastTrainedDate: string | null;
  daysSinceLast: number;
  recommendedIntensity: Intensity;
  priorityScore: number;
  daysUntilStale: number;
}

export interface PillarDailyWorkout {
  date: string;
  pillarId: string;
  pillarName: string;
  exercises: Exercise[];
  warmup: string;
  cooldown: string;
  motivationMessage: string;
  estimatedDuration: number;
}
