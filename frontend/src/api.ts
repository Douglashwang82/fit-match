import type {
  UserProfile,
  WorkoutHistory,
  DailyEnergyLevel,
  TrainingPillar,
  PillarBasedPlan,
  PillarWorkoutRecord,
  PillarDailyWorkout,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function joinWaitlist(
  email: string,
  goal: string
): Promise<void> {
  await fetch(`${BASE_URL}/api/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, user_goal: goal }),
  });
}

export async function getWaitlistCount(): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/waitlist/count`);
  const data = await response.json();
  return data.count as number;
}

// Chat API
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UIAction {
  type: "start_workout" | "show_plan" | "show_progress" | "none";
  energy_level?: DailyEnergyLevel | null;
}

interface ChatResponseData {
  message: string;
  action: UIAction;
}

export async function sendChatMessage(
  profile: UserProfile,
  history: WorkoutHistory,
  messages: ChatMessage[]
): Promise<ChatResponseData> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: {
        age: profile.age,
        gender: profile.gender,
        weight: profile.weight,
        height: profile.height,
        fitness_level: profile.fitnessLevel,
        injuries: profile.injuries,
        current_frequency: profile.currentFrequency,
        preferred_exercises: profile.preferredExercises,
        sleep_hours: profile.sleepHours,
        work_schedule: profile.workSchedule,
        diet_type: profile.dietType,
        goal: profile.goal,
        target_days_per_week: profile.targetDaysPerWeek,
      },
      history: {
        days_completed: history.daysCompleted,
        current_streak: history.currentStreak,
        total_workouts: history.totalWorkouts,
        last_workout_date: history.lastWorkoutDate,
        feedback: history.feedback.map((f) => ({
          date: f.date,
          energy_before: f.energyBefore,
          completed: f.completed,
          difficulty: f.difficulty,
          notes: f.notes,
        })),
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) throw new Error("Failed to send chat message");

  const data = await response.json();
  return {
    message: data.message,
    action: data.action || { type: "none" },
  };
}


// ─── Pillar-Based Training System API ───────────────────────────────────────

// Helper to convert profile to snake_case for API
function convertProfileToSnakeCase(profile: UserProfile) {
  return {
    age: profile.age,
    gender: profile.gender,
    weight: profile.weight,
    height: profile.height,
    fitness_level: profile.fitnessLevel,
    injuries: profile.injuries,
    current_frequency: profile.currentFrequency,
    preferred_exercises: profile.preferredExercises,
    sleep_hours: profile.sleepHours,
    work_schedule: profile.workSchedule,
    diet_type: profile.dietType,
    goal: profile.goal,
    target_days_per_week: profile.targetDaysPerWeek,
  };
}

// Helper to convert pillar to snake_case for API
function convertPillarToSnakeCase(pillar: TrainingPillar) {
  return {
    id: pillar.id,
    name: pillar.name,
    description: pillar.description,
    target_frequency: pillar.targetFrequency,
    example_exercises: pillar.exampleExercises,
    default_duration: pillar.defaultDuration,
    default_intensity: pillar.defaultIntensity,
  };
}

// Helper to convert pillar record to snake_case for API
function convertRecordToSnakeCase(record: PillarWorkoutRecord) {
  return {
    date: record.date,
    pillar_id: record.pillarId,
    duration: record.duration,
    difficulty: record.difficulty,
    energy_before: record.energyBefore,
    completed: record.completed,
  };
}

// Pillar-based Plan API Response
interface PillarPlanApiResponse {
  pillars: Array<{
    id: string;
    name: string;
    description: string;
    target_frequency: number;
    example_exercises: string[];
    default_duration: number;
    default_intensity: "low" | "medium" | "high";
  }>;
  plan_summary: string;
  weekly_goal: string;
  rolling_window_days: number;
}

export async function generatePillarPlan(
  profile: UserProfile
): Promise<PillarBasedPlan> {
  const response = await fetch(`${BASE_URL}/api/pillar-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: convertProfileToSnakeCase(profile),
    }),
  });

  if (!response.ok) throw new Error("Failed to generate pillar plan");

  const data: PillarPlanApiResponse = await response.json();

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    pillars: data.pillars.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      targetFrequency: p.target_frequency,
      exampleExercises: p.example_exercises,
      defaultDuration: p.default_duration,
      defaultIntensity: p.default_intensity,
    })),
    planSummary: data.plan_summary,
    weeklyGoal: data.weekly_goal,
    rollingWindowDays: data.rolling_window_days,
    confirmed: false,
  };
}

// Adaptive Daily Workout API
export async function generateAdaptiveWorkout(
  profile: UserProfile,
  pillars: TrainingPillar[],
  pillarHistory: PillarWorkoutRecord[],
  todayEnergy: DailyEnergyLevel,
  rollingWindowDays: number = 7,
  selectedPillarId?: string
): Promise<PillarDailyWorkout> {
  const response = await fetch(`${BASE_URL}/api/adaptive-workout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: convertProfileToSnakeCase(profile),
      pillars: pillars.map(convertPillarToSnakeCase),
      pillar_history: pillarHistory.map(convertRecordToSnakeCase),
      today_energy: todayEnergy,
      rolling_window_days: rollingWindowDays,
      selected_pillar_id: selectedPillarId || null,
    }),
  });

  if (!response.ok) throw new Error("Failed to generate adaptive workout");

  const data = await response.json();
  return {
    date: data.date,
    pillarId: data.pillar_id,
    pillarName: data.pillar_name,
    exercises: data.exercises,
    warmup: data.warmup,
    cooldown: data.cooldown,
    motivationMessage: data.motivation_message,
    estimatedDuration: data.estimated_duration,
  };
}

// ─── User Data Sync API ──────────────────────────────────────────────────────

export async function ensureUser(userId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/users/${userId}/ensure`, { method: "POST" });
}

export async function saveProfileToBackend(
  userId: string,
  profile: UserProfile
): Promise<void> {
  await fetch(`${BASE_URL}/api/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: convertProfileToSnakeCase(profile),
    }),
  });
}

export async function loadProfileFromBackend(
  userId: string
): Promise<UserProfile | null> {
  const res = await fetch(`${BASE_URL}/api/users/${userId}/profile`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load profile");
  const d = await res.json();
  return {
    age: d.age,
    gender: d.gender,
    weight: d.weight,
    height: d.height,
    fitnessLevel: d.fitness_level,
    injuries: d.injuries ?? [],
    currentFrequency: d.current_frequency,
    preferredExercises: d.preferred_exercises ?? [],
    sleepHours: d.sleep_hours,
    workSchedule: d.work_schedule,
    dietType: d.diet_type,
    goal: d.goal,
    targetDaysPerWeek: d.target_days_per_week,
  } as UserProfile;
}

export async function savePillarPlanToBackend(
  userId: string,
  plan: PillarBasedPlan
): Promise<void> {
  await fetch(`${BASE_URL}/api/users/${userId}/pillar-plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: plan.id,
      plan_summary: plan.planSummary,
      weekly_goal: plan.weeklyGoal,
      rolling_window_days: plan.rollingWindowDays,
      confirmed: plan.confirmed,
      pillars: plan.pillars.map(convertPillarToSnakeCase),
    }),
  });
}

export async function confirmPillarPlanInBackend(userId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/users/${userId}/pillar-plan/confirm`, {
    method: "PUT",
  });
}

export async function loadPillarPlanFromBackend(
  userId: string
): Promise<PillarBasedPlan | null> {
  const res = await fetch(`${BASE_URL}/api/users/${userId}/pillar-plan`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load pillar plan");
  const d = await res.json();
  return {
    id: d.id,
    createdAt: d.created_at,
    planSummary: d.plan_summary,
    weeklyGoal: d.weekly_goal,
    rollingWindowDays: d.rolling_window_days,
    confirmed: d.confirmed,
    pillars: (d.pillars ?? []).map((p: {
      pillar_id: string; name: string; description: string;
      target_frequency: number; example_exercises: string[];
      default_duration: number; default_intensity: "low" | "medium" | "high";
    }) => ({
      id: p.pillar_id,
      name: p.name,
      description: p.description,
      targetFrequency: p.target_frequency,
      exampleExercises: p.example_exercises,
      defaultDuration: p.default_duration,
      defaultIntensity: p.default_intensity,
    })),
  } as PillarBasedPlan;
}

export async function saveWorkoutRecordToBackend(
  userId: string,
  record: PillarWorkoutRecord
): Promise<void> {
  await fetch(`${BASE_URL}/api/users/${userId}/workout-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(convertRecordToSnakeCase(record)),
  });
}

export async function loadWorkoutRecordsFromBackend(
  userId: string,
  days = 30
): Promise<PillarWorkoutRecord[]> {
  const res = await fetch(
    `${BASE_URL}/api/users/${userId}/workout-records?days=${days}`
  );
  if (!res.ok) throw new Error("Failed to load workout records");
  const d = await res.json();
  return (d.records ?? []).map((r: {
    date: string; pillar_id: string; duration: number;
    difficulty: "too_easy" | "just_right" | "too_hard";
    energy_before: "low" | "medium" | "high"; completed: boolean;
  }) => ({
    date: r.date,
    pillarId: r.pillar_id,
    duration: r.duration,
    difficulty: r.difficulty,
    energyBefore: r.energy_before,
    completed: r.completed,
  })) as PillarWorkoutRecord[];
}

// Update pillars (validation)
export async function updatePillars(
  pillars: TrainingPillar[]
): Promise<{ pillars: TrainingPillar[]; valid: boolean }> {
  const response = await fetch(`${BASE_URL}/api/update-pillars`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pillars: pillars.map(convertPillarToSnakeCase),
    }),
  });

  if (!response.ok) throw new Error("Failed to update pillars");

  const data = await response.json();
  return {
    pillars: data.pillars.map((p: PillarPlanApiResponse["pillars"][0]) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      targetFrequency: p.target_frequency,
      exampleExercises: p.example_exercises,
      defaultDuration: p.default_duration,
      defaultIntensity: p.default_intensity,
    })),
    valid: data.valid,
  };
}
