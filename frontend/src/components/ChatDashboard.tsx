import { useState, useRef, useEffect } from "react";
import type {
  UserProfile,
  DailyEnergyLevel,
  PillarBasedPlan,
  PillarWorkoutHistory,
  PillarProgress,
  TrainingPillar,
  PillarDailyWorkout,
} from "../types";
import PillarProgressView from "./PillarProgressView";
import PillarCustomizer from "./PillarCustomizer";

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
  // Pillar-based system props
  pillarPlan: PillarBasedPlan | null;
  pillarHistory: PillarWorkoutHistory;
  pillarProgress: PillarProgress[];
  onSendMessage: (messages: ChatMessage[]) => Promise<{ message: string; action: UIAction }>;
  onGeneratePillarWorkout: (energy: DailyEnergyLevel, pillarId: string) => Promise<PillarDailyWorkout>;
  onPillarWorkoutComplete: (pillarId: string, duration: number, difficulty: "too_easy" | "just_right" | "too_hard") => void;
  onCustomizePillars: (pillars: TrainingPillar[]) => void;
  onResetProfile: () => void;
}

const QUICK_CHIPS = [
  { label: "開始訓練 💪", message: "開始今天的訓練" },
  { label: "查看計畫 📋", message: "看看我的訓練計畫" },
  { label: "今日進度 📊", message: "今天的訓練進度" },
  { label: "需要休息 😴", message: "我今天很累，有什麼建議？" },
];

export default function ChatDashboard({
  profile,
  pillarPlan,
  pillarHistory,
  pillarProgress,
  onSendMessage,
  onGeneratePillarWorkout,
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
  const [currentPillarWorkout, setCurrentPillarWorkout] = useState<PillarDailyWorkout | null>(null);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [recentlyCompletedExercise, setRecentlyCompletedExercise] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCustomizingPillars, setIsCustomizingPillars] = useState(false);
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStats, setCelebrationStats] = useState<{
    duration: number;
    exercisesTotal: number;
    exercisesDone: number;
    pillarName: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sheetMessagesRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // Reset completed exercises when workout changes
  useEffect(() => {
    setCompletedExercises([]);
  }, [currentPillarWorkout?.date]);

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
    if (isChatOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, isChatOpen]);

  // Swipe down on messages to close the sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const el = sheetMessagesRef.current;
    if (!el) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (el.scrollTop <= 0 && dy > 50) {
      setIsChatOpen(false);
    }
  };

  // Scroll up past the top to dismiss on desktop
  const handleMessagesWheel = (e: React.WheelEvent) => {
    const el = sheetMessagesRef.current;
    if (!el) return;
    if (el.scrollTop <= 0 && e.deltaY < 0) {
      setIsChatOpen(false);
    }
  };

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
          // For pillar system, use highest priority pillar
          const topPillar = pillarProgress[0]?.pillar;
          if (topPillar) {
            const workout = await onGeneratePillarWorkout(energy, topPillar.id);
            setCurrentPillarWorkout(workout);
            setSelectedPillarId(topPillar.id);
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
    }
    setPanelView("stats");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "太棒了！今天的訓練完成了！好好休息，明天見！💪" },
    ]);
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
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
                onClick={() => {
                  setCelebrationStats({
                    duration: currentPillarWorkout!.estimatedDuration,
                    exercisesTotal: currentPillarWorkout!.exercises.length,
                    exercisesDone: completedExercises.length,
                    pillarName: currentPillarWorkout!.pillarName,
                  });
                  setShowCelebration(true);
                }}
              >
                完成訓練 ✓
              </button>
            </div>
          </div>
        );
      }
    }

    if (panelView === "plan") {
      return (
        <PillarProgressView
          pillarProgress={pillarProgress}
          onPillarClick={handlePillarClick}
          onCustomize={handleCustomizePillars}
        />
      );
    }

    // Stats view (default)
    const currentStreak = pillarHistory.currentStreak;
    const totalWorkouts = pillarHistory.totalWorkouts;

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
          {pillarProgress.length > 0 ? (
            <div className="today-info">
              <span className="today-focus">建議: {pillarProgress[0].pillar.name}</span>
              <span className="today-meta">
                {pillarProgress[0].pillar.defaultDuration}分鐘 · {getIntensityLabel(pillarProgress[0].recommendedIntensity)}
              </span>
            </div>
          ) : (
            <p className="rest-day">沒有訓練計畫 📋</p>
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

  return (
    <div className="chat-dashboard">
      {showCelebration && celebrationStats && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <div className="celebration-emoji">🎉</div>
            <h2 className="celebration-title">訓練完成！</h2>
            <p className="celebration-subtitle">{celebrationStats.pillarName}</p>
            <div className="celebration-stats">
              <div className="cel-stat">
                <span className="cel-stat-num">{celebrationStats.duration}</span>
                <span className="cel-stat-label">分鐘</span>
              </div>
              <div className="cel-stat">
                <span className="cel-stat-num">{celebrationStats.exercisesDone}/{celebrationStats.exercisesTotal}</span>
                <span className="cel-stat-label">動作完成</span>
              </div>
            </div>
            <button
              className="btn-primary celebration-close"
              onClick={() => {
                setShowCelebration(false);
                setCelebrationStats(null);
                handleWorkoutFinish("just_right");
              }}
            >
              繼續 →
            </button>
          </div>
        </div>
      )}
      <div className="chat-inner">
        {/* Scrollable panel content */}
        <div className="dashboard-content-area">
          <div className="dashboard-panel">
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
                disabled={!currentPillarWorkout && !isGeneratingWorkout}
              >
                訓練
              </button>
            </div>
            <div className="panel-content">{renderPanel()}</div>
            <button className="btn-reset" onClick={onResetProfile}>
              重新設定
            </button>
          </div>
        </div>

        {/* Chat sheet — slides up when input is focused */}
        <div className={`chat-sheet-overlay${isChatOpen ? " open" : ""}`}>
          <div
            className="chat-sheet-handle"
            onClick={() => setIsChatOpen(false)}
          />
          {messages.length <= 1 && (
            <div className="chat-quick-chips">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  className="chat-chip"
                  onClick={() => handleQuickAction(chip.message)}
                  disabled={isLoading}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
          <div
            className="chat-messages-wrap"
            ref={sheetMessagesRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onWheel={handleMessagesWheel}
          >
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
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Always-visible input bar */}
        <div className="chat-input-bar">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsChatOpen(true)}
            placeholder="跟教練說點什麼..."
            rows={1}
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
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
