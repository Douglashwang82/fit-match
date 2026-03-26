import type { UserProfile, WorkoutHistory, TrainingPlan } from "../types";

interface Props {
  profile: UserProfile;
  history: WorkoutHistory;
  plan: TrainingPlan;
  onStartWorkout: () => void;
  onResetProfile: () => void;
}

export default function Dashboard({
  profile,
  history,
  plan,
  onStartWorkout,
  onResetProfile,
}: Props) {
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // Convert Sunday (0) to 7

  const todayPlan = plan.weekOverview.find((d) => d.day === dayOfWeek);
  const hasWorkedOutToday = history.daysCompleted.includes(
    today.toISOString().split("T")[0]
  );

  return (
    <div className="step-container dashboard">
      <div className="dashboard-header">
        <div className="greeting">
          <h1>
            {getGreeting()}，準備好了嗎？
          </h1>
          <p className="goal-reminder">目標：{profile.goal}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{history.currentStreak}</span>
          <span className="stat-label">連續天數</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💪</span>
          <span className="stat-value">{history.totalWorkouts}</span>
          <span className="stat-label">完成訓練</span>
        </div>
      </div>

      {todayPlan && (
        <div className="today-plan-card">
          <div className="today-header">
            <span className="today-label">今日訓練</span>
            <span className="today-day">Day {dayOfWeek}</span>
          </div>
          <h2 className="today-focus">{todayPlan.focus}</h2>
          <div className="today-meta">
            <span>{todayPlan.duration} 分鐘</span>
            <span className="dot">•</span>
            <span>{getIntensityLabel(todayPlan.intensity)}</span>
          </div>

          {hasWorkedOutToday ? (
            <div className="completed-badge">
              <span>✓ 今天已完成</span>
            </div>
          ) : (
            <button className="btn-primary btn-large" onClick={onStartWorkout}>
              開始今天的訓練 →
            </button>
          )}
        </div>
      )}

      <div className="week-progress">
        <p className="section-label">本週進度</p>
        <div className="progress-dots">
          {plan.weekOverview.map((day) => {
            const dayDate = getDateForDay(day.day);
            const isCompleted = history.daysCompleted.includes(dayDate);
            const isToday = day.day === dayOfWeek;

            return (
              <div
                key={day.day}
                className={`progress-dot ${isCompleted ? "completed" : ""} ${isToday ? "today" : ""}`}
                title={day.focus}
              >
                <span className="dot-day">{day.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn-text" onClick={onResetProfile}>
        重新設定個人資料
      </button>
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

function getDateForDay(day: number): string {
  const today = new Date();
  const currentDay = today.getDay() || 7;
  const diff = day - currentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toISOString().split("T")[0];
}
