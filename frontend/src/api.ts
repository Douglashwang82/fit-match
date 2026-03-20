import type { WorkoutData, UserInput } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function generateWorkout(input: UserInput): Promise<WorkoutData> {
  const response = await fetch(`${BASE_URL}/api/generate-workout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_goal: input.goal,
      days_per_week: input.daysPerWeek,
      energy_level: input.energyLevel,
    }),
  });
  if (!response.ok) throw new Error("Failed to generate workout");
  return response.json();
}

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
