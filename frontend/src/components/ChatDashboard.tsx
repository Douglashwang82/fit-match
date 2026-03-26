import { useState, useRef, useEffect, useCallback } from "react";
import type {
  UserProfile,
  WorkoutHistory,
  TrainingPlan,
  DailyWorkout,
  DailyEnergyLevel,
  PillarBasedPlan,
  PillarWorkoutHistory,
  PillarProgress,
  TrainingPillar,
  PillarDailyWorkout,
} from "../types";
import { getTodayWorkout, saveTodayWorkout, clearTodayWorkout, getCompletedPlanDays, togglePlanDayCompletion } from "../storage";
import PillarProgressView from "./PillarProgressView";
import PillarCustomizer from "./PillarCustomizer";

type MobileView = "panel" | "chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UIAction {
  type: "start_workout" | "show_plan" | "show_progress" | "none";
  energy_level?: DailyEnergyLevel | null;
}

type PanelView = "stats" | "plan" | "workout";

interface Props {
  profile: UserProfile;
  history: WorkoutHistory;
  plan: TrainingPlan | null;
  // Pillar-based system props
  pillarPlan: PillarBasedPlan | null;
  pillarHistory: PillarWorkoutHistory;
  pillarProgress: PillarProgress[];
  onSendMessage: (messages: ChatMessage[]) => Promise<{ message: string; action: UIAction }>;
  onGenerateWorkout: (energy: DailyEnergyLevel) => Promise<DailyWorkout>;
  onGeneratePillarWorkout: (energy: DailyEnergyLevel, pillarId: string) => Promise<PillarDailyWorkout>;
  onWorkoutComplete: (difficulty: "too_easy" | "just_right" | "too_hard", notes?: string) => void;
  onPillarWorkoutComplete: (pillarId: string, duration: number, difficulty: "too_easy" | "just_right" | "too_hard") => void;
  onCustomizePillars: (pillars: TrainingPillar[]) => void;
  onResetProfile: () => void;
}

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function ChatDashboard({
  profile,
  history,
  plan,
  pillarPlan,
  pillarHistory,
  pillarProgress,
  onSendMessage,
  onGenerateWorkout,
  onGeneratePillarWorkout,
  onWorkoutComplete,
  onPillarWorkoutComplete,
  onCustomizePillars,
  onResetProfile,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `${getGreeting()}！我是你的專屬健身教練。今天想做什麼？你可以說「開始訓練」、「看看我的計畫」或問我任何健身問題！`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>("stats");
  const [currentWorkout, setCurrentWorkout] = useState<DailyWorkout | null>(null);
  const [currentPillarWorkout, setCurrentPillarWorkout] = useState<PillarDailyWorkout | null>(null);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState<number | null>(null);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [recentlyCompletedExercise, setRecentlyCompletedExercise] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [isCustomizingPillars, setIsCustomizingPillars] = useState(false);
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);

  // Determine if using pillar-based system
  const usePillarSystem = pillarPlan !== null && pillarPlan.confirmed;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMobileNavClick = useCallback((view: MobileView) => {
    setMobileView(view);
  }, []);

  // Load today's workout and completed days from storage on mount
  useEffect(() => {
    const savedWorkout = getTodayWorkout();
    if (savedWorkout) {
      setCurrentWorkout(savedWorkout);
      setPanelView("workout");
    }
    const { completedDays: saved } = getCompletedPlanDays();
    setCompletedDays(saved);
  }, []);

  // Reset completed exercises when workout changes
  useEffect(() => {
    setCompletedExercises([]);
  }, [currentWorkout?.date, currentPillarWorkout?.date]);

  const handleToggleDayComplete = (dayNumber: number) => {
    const newState = togglePlanDayCompletion(dayNumber);
    if (newState) {
      setRecentlyCompleted(dayNumber);
      setTimeout(() => setRecentlyCompleted(null), 600);
    }
    setCompletedDays(getCompletedPlanDays().completedDays);
  };

  const handleToggleExercise = (index: number) => {
    const isCompleted = completedExercises.includes(index);
    if (isCompleted) {
      setCompletedExercises(completedExercises.filter(i => i !== index));
    } else {
      setCompletedExercises([...completedExercises, index]);
      setRecentlyCompletedExercise(index);
      setTimeout(() => setRecentlyCompletedExercise(null), 600);
    }
  };

  // Handle pillar click to start workout
  const handlePillarClick = async (pillar: TrainingPillar) => {
    setSelectedPillarId(pillar.id);
    setPanelView("workout");
    setIsGeneratingWorkout(true);
    try {
      const workout = await onGeneratePillarWorkout("medium", pillar.id);
      setCurrentPillarWorkout(workout);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，產生訓練時發生錯誤。請再試一次。" },
      ]);
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  // Handle pillar customization
  const handleCustomizePillars = () => {
    setIsCustomizingPillars(true);
  };

  const handleSavePillars = (pillars: TrainingPillar[]) => {
    onCustomizePillars(pillars);
    setIsCustomizingPillars(false);
  };

  const handleCancelCustomize = () => {
    setIsCustomizingPillars(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await onSendMessage(newMessages);
      setMessages([...newMessages, { role: "assistant", content: response.message }]);

      // Handle UI actions
      if (response.action && response.action.type !== "none") {
        handleAction(response.action);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "抱歉，發生了一些問題。請稍後再試。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: UIAction) => {
    switch (action.type) {
      case "start_workout":
        setPanelView("workout");
        setIsGeneratingWorkout(true);
        try {
          const energy = action.energy_level || "medium";
          if (usePillarSystem) {
            // For pillar system, use highest priority pillar
            const topPillar = pillarProgress[0]?.pillar;
            if (topPillar) {
              const workout = await onGeneratePillarWorkout(energy, topPillar.id);
              setCurrentPillarWorkout(workout);
              setSelectedPillarId(topPillar.id);
            }
          } else {
            const workout = await onGenerateWorkout(energy);
            setCurrentWorkout(workout);
            saveTodayWorkout(workout);
          }
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "抱歉，產生訓練時發生錯誤。請再試一次。" },
          ]);
        } finally {
          setIsGeneratingWorkout(false);
        }
        break;
      case "show_plan":
        setPanelView("plan");
        break;
      case "show_progress":
        setPanelView("stats");
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleWorkoutFinish = (difficulty: "too_easy" | "just_right" | "too_hard") => {
    if (currentPillarWorkout && selectedPillarId) {
      // Pillar-based workout completion
      onPillarWorkoutComplete(selectedPillarId, currentPillarWorkout.estimatedDuration, difficulty);
      setCurrentPillarWorkout(null);
      setSelectedPillarId(null);
    } else {
      // Legacy workout completion
      onWorkoutComplete(difficulty);
      setCurrentWorkout(null);
      clearTodayWorkout();
    }
    setPanelView("stats");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "太棒了！今天的訓練完成了！好好休息，明天見！💪" },
    ]);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const renderPanel = () => {
    // Handle pillar customization mode
    if (isCustomizingPillars && pillarPlan) {
      return (
        <PillarCustomizer
          pillars={pillarPlan.pillars}
          onSave={handleSavePillars}
          onCancel={handleCancelCustomize}
        />
      );
    }

    if (panelView === "workout") {
      if (isGeneratingWorkout) {
        return (
          <div className="panel-loading">
            <div className="loading-spinner" />
            <p>正在為你準備今天的訓練...</p>
          </div>
        );
      }

      // Pillar-based workout view
      if (currentPillarWorkout) {
        return (
          <div className="workout-panel">
            <div className="workout-panel-header">
              <h3>{currentPillarWorkout.pillarName}</h3>
              <span className="workout-duration">{currentPillarWorkout.estimatedDuration} 分鐘</span>
            </div>

            <div className="workout-motivation">{currentPillarWorkout.motivationMessage}</div>

            <div className="workout-section">
              <h4>熱身</h4>
              <p>{currentPillarWorkout.warmup}</p>
            </div>

            <div className="workout-section">
              <h4>主訓練 <span className="exercise-progress">({completedExercises.length}/{currentPillarWorkout.exercises.length})</span></h4>
              <div className="exercise-list-compact">
                {currentPillarWorkout.exercises.map((ex, idx) => {
                  const isCompleted = completedExercises.includes(idx);
                  const isJustCompleted = recentlyCompletedExercise === idx;
                  return (
                    <div
                      key={idx}
                      className={`exercise-item-compact ${isCompleted ? "completed" : ""} ${isJustCompleted ? "just-completed" : ""}`}
                      onClick={() => handleToggleExercise(idx)}
                    >
                      <div className="exercise-checkbox">
                        <div className={`checkbox ${isCompleted ? "checked" : ""}`}>
                          {isCompleted && (
                            <svg className="checkmark" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="exercise-num">{idx + 1}</span>
                      <div className="exercise-info">
                        <span className="exercise-name">{ex.name}</span>
                        <span className="exercise-detail">
                          {ex.sets != null && ex.reps && `${ex.sets}組 × ${ex.reps}`}
                          {ex.duration_seconds != null && `${ex.duration_seconds}秒`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="workout-section">
              <h4>收操</h4>
              <p>{currentPillarWorkout.cooldown}</p>
            </div>

            <div className="workout-actions">
              <button
                className="btn-workout-done"
                onClick={() => handleWorkoutFinish("just_right")}
              >
                完成訓練 ✓
              </button>
            </div>
          </div>
        );
      }

      // Legacy workout view
      if (currentWorkout) {
        return (
          <div className="workout-panel">
            <div className="workout-panel-header">
              <h3>今日訓練</h3>
              <span className="workout-duration">{currentWorkout.estimatedDuration} 分鐘</span>
            </div>

            <div className="workout-motivation">{currentWorkout.motivationMessage}</div>

            <div className="workout-section">
              <h4>熱身</h4>
              <p>{currentWorkout.warmup}</p>
            </div>

            <div className="workout-section">
              <h4>主訓練 <span className="exercise-progress">({completedExercises.length}/{currentWorkout.exercises.length})</span></h4>
              <div className="exercise-list-compact">
                {currentWorkout.exercises.map((ex, idx) => {
                  const isCompleted = completedExercises.includes(idx);
                  const isJustCompleted = recentlyCompletedExercise === idx;
                  return (
                    <div
                      key={idx}
                      className={`exercise-item-compact ${isCompleted ? "completed" : ""} ${isJustCompleted ? "just-completed" : ""}`}
                      onClick={() => handleToggleExercise(idx)}
                    >
                      <div className="exercise-checkbox">
                        <div className={`checkbox ${isCompleted ? "checked" : ""}`}>
                          {isCompleted && (
                            <svg className="checkmark" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="exercise-num">{idx + 1}</span>
                      <div className="exercise-info">
                        <span className="exercise-name">{ex.name}</span>
                        <span className="exercise-detail">
                          {ex.sets != null && ex.reps && `${ex.sets}組 × ${ex.reps}`}
                          {ex.duration_seconds != null && `${ex.duration_seconds}秒`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="workout-section">
              <h4>收操</h4>
              <p>{currentWorkout.cooldown}</p>
            </div>

            <div className="workout-actions">
              <button
                className="btn-workout-done"
                onClick={() => handleWorkoutFinish("just_right")}
              >
                完成訓練 ✓
              </button>
            </div>
          </div>
        );
      }
    }

    if (panelView === "plan") {
      // Pillar-based plan view
      if (usePillarSystem) {
        return (
          <PillarProgressView
            pillarProgress={pillarProgress}
            onPillarClick={handlePillarClick}
            onCustomize={handleCustomizePillars}
          />
        );
      }

      // Legacy 7-day plan view
      if (plan) {
        return (
          <div className="plan-panel">
            <h3>本週訓練計畫</h3>
            <p className="plan-hint">點擊打勾完成項目</p>
            <div className="plan-grid">
              {plan.weekOverview.map((day) => {
                const isCompleted = completedDays.includes(day.day);
                const isJustCompleted = recentlyCompleted === day.day;
                return (
                  <div
                    key={day.day}
                    className={`plan-day ${getDayClass(day.intensity)} ${isCompleted ? "completed" : ""} ${isJustCompleted ? "just-completed" : ""}`}
                    onClick={() => handleToggleDayComplete(day.day)}
                  >
                    <div className="plan-day-checkbox">
                      <div className={`checkbox ${isCompleted ? "checked" : ""}`}>
                        {isCompleted && (
                          <svg className="checkmark" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="plan-day-content">
                      <div className="plan-day-header">
                        <span className="plan-day-num">Day {day.day}</span>
                        <span className="plan-day-label">週{DAY_LABELS[day.day % 7]}</span>
                      </div>
                      <div className="plan-day-focus">{day.focus}</div>
                      <div className="plan-day-meta">
                        {day.duration}分 · {getIntensityLabel(day.intensity)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }

    // Stats view (default)
    const currentStreak = usePillarSystem ? pillarHistory.currentStreak : history.currentStreak;
    const totalWorkouts = usePillarSystem ? pillarHistory.totalWorkouts : history.totalWorkouts;

    return (
      <div className="stats-panel">
        <h3>{getGreeting()}！{profile.goal.slice(0, 20)}...</h3>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-icon">🔥</span>
            <span className="stat-num">{currentStreak}</span>
            <span className="stat-label">連續天數</span>
          </div>
          <div className="stat-box">
            <span className="stat-icon">💪</span>
            <span className="stat-num">{totalWorkouts}</span>
            <span className="stat-label">完成訓練</span>
          </div>
        </div>

        <div className="today-preview">
          <h4>今日安排</h4>
          {usePillarSystem ? (
            pillarProgress.length > 0 ? (
              <div className="today-info">
                <span className="today-focus">建議: {pillarProgress[0].pillar.name}</span>
                <span className="today-meta">
                  {pillarProgress[0].pillar.defaultDuration}分鐘 · {getIntensityLabel(pillarProgress[0].recommendedIntensity)}
                </span>
              </div>
            ) : (
              <p className="rest-day">沒有訓練計畫 📋</p>
            )
          ) : getTodayPlan() ? (
            <div className="today-info">
              <span className="today-focus">{getTodayPlan()?.focus}</span>
              <span className="today-meta">
                {getTodayPlan()?.duration}分鐘 · {getIntensityLabel(getTodayPlan()?.intensity || "medium")}
              </span>
            </div>
          ) : (
            <p className="rest-day">今天是休息日 🧘</p>
          )}
        </div>

        <div className="quick-actions">
          <button onClick={() => handleQuickAction("開始今天的訓練")}>
            開始訓練 →
          </button>
          <button onClick={() => setPanelView("plan")}>查看計畫</button>
        </div>
      </div>
    );
  };

  const getTodayPlan = () => {
    if (!plan) return null;
    const dayOfWeek = new Date().getDay() || 7;
    return plan.weekOverview.find((d) => d.day === dayOfWeek);
  };

  return (
    <div className="chat-dashboard">
      {/* Side Panel */}
      <div className={`dashboard-panel ${isMobile && mobileView === "panel" ? "mobile-visible" : ""}`}>
        <div className="panel-tabs">
          <button
            className={panelView === "stats" ? "active" : ""}
            onClick={() => setPanelView("stats")}
          >
            總覽
          </button>
          <button
            className={panelView === "plan" ? "active" : ""}
            onClick={() => setPanelView("plan")}
          >
            計畫
          </button>
          <button
            className={panelView === "workout" ? "active" : ""}
            onClick={() => setPanelView("workout")}
            disabled={!currentWorkout && !currentPillarWorkout && !isGeneratingWorkout}
          >
            訓練
          </button>
        </div>

        <div className="panel-content">{renderPanel()}</div>

        <button className="btn-reset" onClick={onResetProfile}>
          重新設定
        </button>
      </div>

      {/* Chat Area */}
      <div className={`chat-area ${isMobile && mobileView === "panel" ? "mobile-hidden" : ""}`}>
        <div className="chat-messages-main">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-msg ${msg.role === "user" ? "user" : "assistant"}`}
            >
              {msg.role === "assistant" && <span className="msg-avatar">🏋️</span>}
              <div className="msg-bubble">{msg.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-msg assistant">
              <span className="msg-avatar">🏋️</span>
              <div className="msg-bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-main">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="跟教練說點什麼..."
            rows={1}
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}>
            發送
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <nav className="mobile-nav">
          <button
            className={mobileView === "panel" ? "active" : ""}
            onClick={() => handleMobileNavClick("panel")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span>面板</span>
          </button>
          <button
            className={mobileView === "chat" ? "active" : ""}
            onClick={() => handleMobileNavClick("chat")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>對話</span>
          </button>
        </nav>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早安";
  if (hour < 18) return "午安";
  return "晚安";
}

function getIntensityLabel(intensity: string): string {
  const labels: Record<string, string> = {
    low: "輕鬆",
    medium: "中等",
    high: "高強度",
  };
  return labels[intensity] || intensity;
}

function getDayClass(intensity: string): string {
  return `intensity-${intensity}`;
}
