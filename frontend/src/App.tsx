import { useState, useEffect, useMemo } from "react";
import type {
  AppView,
  UserProfile,
  TrainingPlan,
  WorkoutHistory,
  DailyWorkout,
  DailyEnergyLevel,
  Gender,
  FitnessLevel,
  WorkSchedule,
  DietType,
  WorkoutDifficulty,
  PillarBasedPlan,
  PillarWorkoutHistory,
  TrainingPillar,
  PillarDailyWorkout,
} from "./types";
import {
  generateTrainingPlan,
  generateDailyWorkout,
  sendChatMessage,
  generatePillarPlan,
  generateAdaptiveWorkout,
  updatePillars,
} from "./api";
import {
  getProfile,
  saveProfile,
  getPlan,
  savePlan,
  confirmPlan,
  getHistory,
  recordWorkoutCompletion,
  clearAll,
  getPillarPlan,
  savePillarPlan,
  confirmPillarPlan,
  getPillarHistory,
  recordPillarWorkoutCompletion,
  calculatePillarProgress,
  migrateToV2Plan,
} from "./storage";
import { BodyInfoStep, HabitsStep, GoalStep } from "./components/ProfileSetup";
import PlanReview from "./components/PlanReview";
import ChatDashboard from "./components/ChatDashboard";
import ThemeToggle from "./components/ThemeToggle";
import "./App.css";

interface BodyInfo {
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  fitnessLevel: FitnessLevel;
  injuries: string[];
}

interface HabitsData {
  currentFrequency: number;
  preferredExercises: string[];
  sleepHours: number;
  workSchedule: WorkSchedule;
  dietType: DietType;
}

interface GoalData {
  goal: string;
  targetDaysPerWeek: number;
}

type ProfileStep = "body" | "habits" | "goal";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [view, setView] = useState<AppView>("profile-setup");
  const [profileStep, setProfileStep] = useState<ProfileStep>("body");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [planResponse, setPlanResponse] = useState<{
    week_overview: TrainingPlan["weekOverview"];
    plan_summary: string;
    weekly_goal: string;
  } | null>(null);
  const [history, setHistory] = useState<WorkoutHistory>(getHistory());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Partial profile data during setup
  const [bodyInfo, setBodyInfo] = useState<BodyInfo | null>(null);
  const [habitsData, setHabitsData] = useState<HabitsData | null>(null);

  // Pillar-based system state
  const [pillarPlan, setPillarPlan] = useState<PillarBasedPlan | null>(null);
  const [pillarHistory, setPillarHistory] = useState<PillarWorkoutHistory>(getPillarHistory());

  // Use pillar system by default for new plans
  const usePillarSystem = true;

  // Calculate pillar progress
  const pillarProgress = useMemo(() => {
    if (!pillarPlan) return [];
    return calculatePillarProgress(
      pillarPlan.pillars,
      pillarHistory,
      pillarPlan.rollingWindowDays
    );
  }, [pillarPlan, pillarHistory]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  // Initialize from localStorage
  useEffect(() => {
    const savedProfile = getProfile();
    const savedPlan = getPlan();
    const savedPillarPlan = getPillarPlan();
    const savedHistory = getHistory();
    const savedPillarHistory = getPillarHistory();

    // Try to migrate legacy data to pillar system
    migrateToV2Plan();

    if (savedProfile) {
      setProfile(savedProfile);
      setHistory(savedHistory);
      setPillarHistory(savedPillarHistory);

      // Check for pillar plan first (new system)
      if (savedPillarPlan && savedPillarPlan.confirmed) {
        setPillarPlan(savedPillarPlan);
        setView("dashboard");
      } else if (savedPlan && savedPlan.confirmed) {
        // Fall back to legacy plan
        setPlan(savedPlan);
        setPlanResponse({
          week_overview: savedPlan.weekOverview,
          plan_summary: "",
          weekly_goal: "",
        });
        setView("dashboard");
      }
    }
  }, []);

  // Profile Setup Handlers
  const handleBodyInfoNext = (data: BodyInfo) => {
    setBodyInfo(data);
    setProfileStep("habits");
  };

  const handleHabitsNext = (data: HabitsData) => {
    setHabitsData(data);
    setProfileStep("goal");
  };

  const handleGoalNext = async (data: GoalData) => {
    if (!bodyInfo || !habitsData) return;

    const fullProfile: UserProfile = {
      ...bodyInfo,
      ...habitsData,
      ...data,
    };

    setProfile(fullProfile);
    saveProfile(fullProfile);
    setIsLoading(true);
    setError(null);

    try {
      if (usePillarSystem) {
        // Generate pillar-based plan
        const response = await generatePillarPlan(fullProfile);
        setPillarPlan(response);
        savePillarPlan(response);
      } else {
        // Legacy 7-day plan
        const response = await generateTrainingPlan(fullProfile);
        setPlanResponse(response);
      }
      setView("plan-review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "產生計畫時發生錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!profile) return;

    setIsLoading(true);
    setError(null);

    try {
      if (usePillarSystem) {
        const response = await generatePillarPlan(profile);
        setPillarPlan(response);
        savePillarPlan(response);
      } else {
        const response = await generateTrainingPlan(profile);
        setPlanResponse(response);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "產生計畫時發生錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPlan = () => {
    if (usePillarSystem && pillarPlan) {
      confirmPillarPlan();
      setPillarPlan({ ...pillarPlan, confirmed: true });
      setView("dashboard");
      return;
    }

    if (!planResponse) return;

    const newPlan: TrainingPlan = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      weekOverview: planResponse.week_overview,
      confirmed: true,
    };

    setPlan(newPlan);
    savePlan(newPlan);
    confirmPlan();
    setView("dashboard");
  };

  const handleResetProfile = () => {
    clearAll();
    setProfile(null);
    setPlan(null);
    setPlanResponse(null);
    setPillarPlan(null);
    setPillarHistory(getPillarHistory());
    setBodyInfo(null);
    setHabitsData(null);
    setHistory(getHistory());
    setProfileStep("body");
    setView("profile-setup");
  };

  // Chat handler
  const handleChatMessage = async (messages: { role: "user" | "assistant"; content: string }[]) => {
    if (!profile) throw new Error("No profile");
    return sendChatMessage(profile, history, messages);
  };

  // Generate workout handler for ChatDashboard
  const handleGenerateWorkout = async (energy: DailyEnergyLevel): Promise<DailyWorkout> => {
    if (!profile || !planResponse) throw new Error("No profile or plan");

    const dayOfWeek = new Date().getDay() || 7;
    return generateDailyWorkout(profile, planResponse, history, energy, dayOfWeek);
  };

  // Workout complete handler for ChatDashboard
  const handleWorkoutComplete = (difficulty: WorkoutDifficulty, notes?: string) => {
    recordWorkoutCompletion(true, "medium", difficulty, notes);
    setHistory(getHistory());
  };

  // Pillar workout handlers
  const handleGeneratePillarWorkout = async (
    energy: DailyEnergyLevel,
    pillarId: string
  ): Promise<PillarDailyWorkout> => {
    if (!profile || !pillarPlan) throw new Error("No profile or pillar plan");

    return generateAdaptiveWorkout(
      profile,
      pillarPlan.pillars,
      pillarHistory.pillarRecords,
      energy,
      pillarPlan.rollingWindowDays,
      pillarId
    );
  };

  const handlePillarWorkoutComplete = (
    pillarId: string,
    duration: number,
    difficulty: WorkoutDifficulty
  ) => {
    recordPillarWorkoutCompletion(pillarId, duration, "medium", difficulty, true);
    setPillarHistory(getPillarHistory());
  };

  const handleCustomizePillars = async (pillars: TrainingPillar[]) => {
    if (!pillarPlan) return;

    try {
      const result = await updatePillars(pillars);
      if (result.valid) {
        const updatedPlan: PillarBasedPlan = {
          ...pillarPlan,
          pillars: result.pillars,
        };
        setPillarPlan(updatedPlan);
        savePillarPlan(updatedPlan);
      }
    } catch (e) {
      console.error("Failed to update pillars:", e);
    }
  };

  // Render
  const renderContent = () => {
    if (view === "profile-setup") {
      if (profileStep === "body") {
        return <BodyInfoStep onNext={handleBodyInfoNext} initialData={bodyInfo || undefined} />;
      }
      if (profileStep === "habits") {
        return (
          <HabitsStep
            onNext={handleHabitsNext}
            onBack={() => setProfileStep("body")}
            initialData={habitsData || undefined}
          />
        );
      }
      if (profileStep === "goal") {
        return (
          <GoalStep
            onNext={handleGoalNext}
            onBack={() => setProfileStep("habits")}
          />
        );
      }
    }

    if (view === "plan-review") {
      if (usePillarSystem && pillarPlan) {
        return (
          <PlanReview
            pillarPlan={pillarPlan}
            onConfirm={handleConfirmPlan}
            onRegenerate={handleRegeneratePlan}
            isLoading={isLoading}
          />
        );
      }
      if (planResponse) {
        return (
          <PlanReview
            plan={planResponse}
            onConfirm={handleConfirmPlan}
            onRegenerate={handleRegeneratePlan}
            isLoading={isLoading}
          />
        );
      }
    }

    if (view === "dashboard" && profile && (plan || pillarPlan)) {
      return (
        <ChatDashboard
          profile={profile}
          history={history}
          plan={plan}
          pillarPlan={pillarPlan}
          pillarHistory={pillarHistory}
          pillarProgress={pillarProgress}
          onSendMessage={handleChatMessage}
          onGenerateWorkout={handleGenerateWorkout}
          onGeneratePillarWorkout={handleGeneratePillarWorkout}
          onWorkoutComplete={handleWorkoutComplete}
          onPillarWorkoutComplete={handlePillarWorkoutComplete}
          onCustomizePillars={handleCustomizePillars}
          onResetProfile={handleResetProfile}
        />
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="step-container">
          <div className="loading-spinner" />
          <p className="loading-text">正在產生你的專屬計畫...</p>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="step-container">
          <h1 className="step-title">發生錯誤</h1>
          <p className="error-text">{error}</p>
          <button className="btn-primary" onClick={() => setError(null)}>
            重試
          </button>
        </div>
      );
    }

    return null;
  };

  // For dashboard view, render without the standard app-main wrapper
  if (view === "dashboard" && profile && (plan || pillarPlan)) {
    return (
      <div className="app app-dashboard">
        <header className="app-header">
          <div className="logo">
            SyncMotion<span className="logo-dot">.</span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          SyncMotion<span className="logo-dot">.</span>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="app-main">{renderContent()}</main>
    </div>
  );
}
