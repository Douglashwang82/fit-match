export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds: number;
  notes?: string;
}

export interface WorkoutData {
  day1_workout: Exercise[];
  motivation_message: string;
  workout_summary: string;
}

export type EnergyLevel = "energized" | "tired" | "exhausted";

export interface UserInput {
  goal: string;
  daysPerWeek: number;
  energyLevel: EnergyLevel;
}

export type AppStep = 1 | 2 | 3 | 4;
