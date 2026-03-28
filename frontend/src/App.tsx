import { useState, useEffect, useMemo, useRef, Component, type ReactNode } from "react";
import type {
  AppView,
  UserProfile,
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
  sendChatMessage,
  generatePillarPlan,
  generateAdaptiveWorkout,
  updatePillars,
} from "./api";
import {
  getProfile,
  saveProfile,
  clearAll,
  getPillarPlan,
  savePillarPlan,
  confirmPillarPlan,
  getPillarHistory,
  recordPillarWorkoutCompletion,
  calculatePillarProgress,
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

const LOADING_MESSAGES = [
  "分析你的健身目標與體能狀況...",
  "根據你的習慣設計訓練架構...",
  "規劃專屬的訓練柱組合...",
  "調整強度與每週訓練頻率...",
  "整合睡眠、飲食與工作習慣...",
  "為你準備個人化訓練計畫...",
];

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMsg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">🛠️</div>
            <h1>哎呀，出了點問題</h1>
            <p className="error-boundary-msg">應用程式發生錯誤，請重新整理頁面。</p>
            <p className="error-boundary-detail">{this.state.errorMsg}</p>
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export { ErrorBoundary };

function PlanLoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(msgTimer);
  }, []);

  useEffect(() => {
    const progTimer = setInterval(() => {
      if (progressRef.current < 88) {
        // Accelerate early, slow down near the end
        const step = progressRef.current < 40 ? 2 : 0.8;
        progressRef.current = Math.min(progressRef.current + step, 88);
        setProgress(progressRef.current);
      }
    }, 180);
    return () => clearInterval(progTimer);
  }, []);

  return (
    <div className="plan-loading-screen">
      <div className="plan-loading-icon">🏋️</div>
      <h2 className="plan-loading-title">正在建立你的訓練計畫</h2>
      <p key={msgIdx} className="plan-loading-msg">{LOADING_MESSAGES[msgIdx]}</p>
      <div className="plan-loading-bar">
        <div className="plan-loading-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="plan-loading-hint">這需要約 10–20 秒，請稍候</p>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [view, setView] = useState<AppView>("profile-setup");
  const [profileStep, setProfileStep] = useState<ProfileStep>("body");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Partial profile data during setup
  const [bodyInfo, setBodyInfo] = useState<BodyInfo | null>(null);
  const [habitsData, setHabitsData] = useState<HabitsData | null>(null);

  // Pillar-based system state
  const [pillarPlan, setPillarPlan] = useState<PillarBasedPlan | null>(null);
  const [pillarHistory, setPillarHistory] = useState<PillarWorkoutHistory>(getPillarHistory());

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
    const savedPillarPlan = getPillarPlan();
    const savedPillarHistory = getPillarHistory();

    if (savedProfile) {
      setProfile(savedProfile);
      setPillarHistory(savedPillarHistory);

      if (savedPillarPlan && savedPillarPlan.confirmed) {
        setPillarPlan(savedPillarPlan);
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
      const response = await generatePillarPlan(fullProfile);
      setPillarPlan(response);
      savePillarPlan(response);
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
      const response = await generatePillarPlan(profile);
      setPillarPlan(response);
      savePillarPlan(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "產生計畫時發生錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPlan = () => {
    if (!pillarPlan) return;
    confirmPillarPlan();
    setPillarPlan({ ...pillarPlan, confirmed: true });
    setView("dashboard");
  };

  const handleResetProfile = () => {
    clearAll();
    setProfile(null);
    setPillarPlan(null);
    setPillarHistory(getPillarHistory());
    setBodyInfo(null);
    setHabitsData(null);
    setProfileStep("body");
    setView("profile-setup");
  };

  // Chat handler
  const handleChatMessage = async (messages: { role: "user" | "assistant"; content: string }[]) => {
    if (!profile) throw new Error("No profile");
    const history = getPillarHistory();
    // Build a minimal WorkoutHistory from pillar history for the chat API
    return sendChatMessage(profile, {
      daysCompleted: [],
      currentStreak: history.currentStreak,
      totalWorkouts: history.totalWorkouts,
      lastWorkoutDate: history.lastWorkoutDate,
      feedback: [],
    }, messages);
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
    if (isLoading) {
      return <PlanLoadingScreen />;
    }

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

    if (view === "plan-review" && pillarPlan) {
      return (
        <PlanReview
          pillarPlan={pillarPlan}
          onConfirm={handleConfirmPlan}
          onRegenerate={handleRegeneratePlan}
          isLoading={isLoading}
        />
      );
    }

    if (view === "dashboard" && profile && pillarPlan) {
      return (
        <ChatDashboard
          profile={profile}
          pillarPlan={pillarPlan}
          pillarHistory={pillarHistory}
          pillarProgress={pillarProgress}
          onSendMessage={handleChatMessage}
          onGeneratePillarWorkout={handleGeneratePillarWorkout}
          onPillarWorkoutComplete={handlePillarWorkoutComplete}
          onCustomizePillars={handleCustomizePillars}
          onResetProfile={handleResetProfile}
        />
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
  if (view === "dashboard" && profile && pillarPlan) {
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
