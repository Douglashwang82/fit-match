import { describe, test, expect } from 'vitest';
import {
  saveProfile,
  getProfile,
  getHistory,
  saveHistory,
  recordWorkoutCompletion,
  savePlan,
  getPlan,
  confirmPlan,
  saveTodayWorkout,
  getTodayWorkout,
  clearTodayWorkout,
  clearAll,
  hasCompletedSetup,
} from '../storage';
import type { UserProfile, WorkoutHistory, TrainingPlan, DailyWorkout } from '../types';

const mockProfile: UserProfile = {
  age: 30,
  gender: 'male',
  weight: 75,
  height: 175,
  fitnessLevel: 'intermediate',
  injuries: ['knee'],
  currentFrequency: 3,
  preferredExercises: ['running'],
  sleepHours: 7,
  workSchedule: 'morning',
  dietType: 'standard',
  goal: 'Build muscle',
  targetDaysPerWeek: 4,
};

const mockPlan: TrainingPlan = {
  id: 'plan-123',
  createdAt: '2024-01-01T00:00:00Z',
  weekOverview: [
    { day: 1, focus: 'Upper Body', duration: 45, intensity: 'medium' },
    { day: 2, focus: 'Lower Body', duration: 45, intensity: 'medium' },
  ],
  confirmed: false,
};

// Helper to get local date string (same as in storage.ts)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const mockWorkout: DailyWorkout = {
  date: getLocalDateString(),
  dayNumber: 1,
  exercises: [{ name: 'Push-ups', sets: 3, reps: '10', rest_seconds: 60 }],
  warmup: '5 min jog',
  cooldown: '5 min stretch',
  motivationMessage: 'Great job!',
  estimatedDuration: 30,
};

describe('Profile Storage', () => {
  test('saveProfile and getProfile roundtrip', () => {
    saveProfile(mockProfile);
    const result = getProfile();

    expect(result).toEqual(mockProfile);
  });

  test('getProfile returns null when empty', () => {
    const result = getProfile();
    expect(result).toBeNull();
  });

  test('getProfile handles corrupted data', () => {
    localStorage.setItem('syncmotion_profile', 'not valid json {{{');
    const result = getProfile();
    expect(result).toBeNull();
  });

  test('saveProfile overwrites previous data', () => {
    saveProfile(mockProfile);
    const updatedProfile = { ...mockProfile, age: 35 };
    saveProfile(updatedProfile);

    const result = getProfile();
    expect(result?.age).toBe(35);
  });
});

describe('History Storage', () => {
  test('getHistory returns default when empty', () => {
    const result = getHistory();

    expect(result).toEqual({
      daysCompleted: [],
      currentStreak: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
      feedback: [],
    });
  });

  test('getHistory handles corrupted data', () => {
    localStorage.setItem('syncmotion_history', 'invalid json');
    const result = getHistory();

    expect(result).toEqual({
      daysCompleted: [],
      currentStreak: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
      feedback: [],
    });
  });

  test('saveHistory and getHistory roundtrip', () => {
    const history: WorkoutHistory = {
      daysCompleted: ['2024-01-01', '2024-01-02'],
      currentStreak: 2,
      totalWorkouts: 10,
      lastWorkoutDate: '2024-01-02',
      feedback: [],
    };

    saveHistory(history);
    const result = getHistory();

    expect(result).toEqual(history);
  });
});

describe('recordWorkoutCompletion', () => {
  test('creates streak on first workout', () => {
    recordWorkoutCompletion(true, 'medium', 'just_right');

    const history = getHistory();
    expect(history.currentStreak).toBe(1);
    expect(history.totalWorkouts).toBe(1);
    expect(history.daysCompleted.length).toBe(1);
  });

  test('increments streak on consecutive day', () => {
    // Setup: workout yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const initialHistory: WorkoutHistory = {
      daysCompleted: [yesterdayStr],
      currentStreak: 1,
      totalWorkouts: 1,
      lastWorkoutDate: yesterdayStr,
      feedback: [],
    };
    saveHistory(initialHistory);

    // Complete workout today
    recordWorkoutCompletion(true, 'medium', 'just_right');

    const history = getHistory();
    expect(history.currentStreak).toBe(2);
    expect(history.totalWorkouts).toBe(2);
  });

  test('resets streak after gap', () => {
    // Setup: workout 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = getLocalDateString(threeDaysAgo);

    const initialHistory: WorkoutHistory = {
      daysCompleted: [threeDaysAgoStr],
      currentStreak: 5,
      totalWorkouts: 20,
      lastWorkoutDate: threeDaysAgoStr,
      feedback: [],
    };
    saveHistory(initialHistory);

    // Complete workout today
    recordWorkoutCompletion(true, 'medium', 'just_right');

    const history = getHistory();
    expect(history.currentStreak).toBe(1); // Reset to 1
    expect(history.totalWorkouts).toBe(21);
  });

  test('same day does not double count days', () => {
    // First workout today
    recordWorkoutCompletion(true, 'medium', 'just_right');

    const historyAfterFirst = getHistory();
    expect(historyAfterFirst.totalWorkouts).toBe(1);
    expect(historyAfterFirst.currentStreak).toBe(1);

    // Second workout same day
    recordWorkoutCompletion(true, 'high', 'too_easy');

    const historyAfterSecond = getHistory();
    // Should not increment totalWorkouts or daysCompleted
    expect(historyAfterSecond.totalWorkouts).toBe(1);
    expect(historyAfterSecond.daysCompleted.length).toBe(1);
    // Feedback should be added
    expect(historyAfterSecond.feedback.length).toBe(2);
  });

  test('records feedback even when not completed', () => {
    recordWorkoutCompletion(false, 'low', 'too_hard', 'Too tired');

    const history = getHistory();
    expect(history.totalWorkouts).toBe(0);
    expect(history.currentStreak).toBe(0);
    expect(history.feedback.length).toBe(1);
    expect(history.feedback[0].completed).toBe(false);
    expect(history.feedback[0].notes).toBe('Too tired');
  });
});

describe('Plan Storage', () => {
  test('savePlan and getPlan roundtrip', () => {
    savePlan(mockPlan);
    const result = getPlan();

    expect(result).toEqual(mockPlan);
  });

  test('getPlan returns null when empty', () => {
    const result = getPlan();
    expect(result).toBeNull();
  });

  test('getPlan handles corrupted data', () => {
    localStorage.setItem('syncmotion_plan', 'bad json');
    const result = getPlan();
    expect(result).toBeNull();
  });

  test('confirmPlan sets confirmed to true', () => {
    savePlan(mockPlan);
    confirmPlan();

    const result = getPlan();
    expect(result?.confirmed).toBe(true);
  });

  test('confirmPlan does nothing if no plan exists', () => {
    // Should not throw
    confirmPlan();
    expect(getPlan()).toBeNull();
  });
});

describe('Today Workout Storage', () => {
  test('saveTodayWorkout and getTodayWorkout roundtrip', () => {
    saveTodayWorkout(mockWorkout);
    const result = getTodayWorkout();

    expect(result).toEqual(mockWorkout);
  });

  test('getTodayWorkout returns null for yesterday workout', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const oldWorkout: DailyWorkout = {
      ...mockWorkout,
      date: getLocalDateString(yesterday),
    };

    saveTodayWorkout(oldWorkout);
    const result = getTodayWorkout();

    expect(result).toBeNull();
  });

  test('getTodayWorkout clears stale workout', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const oldWorkout: DailyWorkout = {
      ...mockWorkout,
      date: getLocalDateString(yesterday),
    };

    saveTodayWorkout(oldWorkout);
    getTodayWorkout(); // Should clear

    // Verify it was cleared
    expect(localStorage.getItem('syncmotion_today_workout')).toBeNull();
  });

  test('clearTodayWorkout removes workout', () => {
    saveTodayWorkout(mockWorkout);
    clearTodayWorkout();

    const result = getTodayWorkout();
    expect(result).toBeNull();
  });
});

describe('clearAll', () => {
  test('clears all storage keys', () => {
    saveProfile(mockProfile);
    savePlan(mockPlan);
    saveTodayWorkout(mockWorkout);
    recordWorkoutCompletion(true, 'medium', 'just_right');

    clearAll();

    expect(getProfile()).toBeNull();
    expect(getPlan()).toBeNull();
    expect(getTodayWorkout()).toBeNull();
    expect(getHistory().totalWorkouts).toBe(0);
  });
});

describe('hasCompletedSetup', () => {
  test('returns false when no profile', () => {
    expect(hasCompletedSetup()).toBe(false);
  });

  test('returns false when no plan', () => {
    saveProfile(mockProfile);
    expect(hasCompletedSetup()).toBe(false);
  });

  test('returns false when plan not confirmed', () => {
    saveProfile(mockProfile);
    savePlan(mockPlan);
    expect(hasCompletedSetup()).toBe(false);
  });

  test('returns true when profile exists and plan confirmed', () => {
    saveProfile(mockProfile);
    savePlan(mockPlan);
    confirmPlan();

    expect(hasCompletedSetup()).toBe(true);
  });
});
