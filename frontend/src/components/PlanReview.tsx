import type { DayPlan, PillarBasedPlan } from "../types";

interface LegacyPlanData {
  week_overview: DayPlan[];
  plan_summary: string;
  weekly_goal: string;
}

interface Props {
  plan?: LegacyPlanData | null;
  pillarPlan?: PillarBasedPlan | null;
  onConfirm: () => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

const INTENSITY_COLORS = {
  low: "intensity-low",
  medium: "intensity-medium",
  high: "intensity-high",
};

const INTENSITY_LABELS = {
  low: "輕鬆",
  medium: "中等",
  high: "高強度",
};

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export default function PlanReview({
  plan,
  pillarPlan,
  onConfirm,
  onRegenerate,
  isLoading,
}: Props) {
  // Pillar-based plan view
  if (pillarPlan) {
    const totalFrequency = pillarPlan.pillars.reduce(
      (sum, p) => sum + p.targetFrequency,
      0
    );

    return (
      <div className="step-container plan-review">
        <h1 className="step-title">你的訓練支柱</h1>
        <p className="step-subtitle">{pillarPlan.planSummary}</p>

        <div className="weekly-goal">
          <span className="goal-icon">🎯</span>
          <span>
            {pillarPlan.weeklyGoal} (每{pillarPlan.rollingWindowDays}天 {totalFrequency} 次)
          </span>
        </div>

        <div className="pillar-overview">
          {pillarPlan.pillars.map((pillar) => (
            <div
              key={pillar.id}
              className={`pillar-card-review ${INTENSITY_COLORS[pillar.defaultIntensity]}`}
            >
              <div className="pillar-header">
                <span className="pillar-name">{pillar.name}</span>
                <span className="pillar-freq">{pillar.targetFrequency}x/週</span>
              </div>
              <div className="pillar-description">{pillar.description}</div>
              <div className="pillar-meta">
                <span className="pillar-duration">{pillar.defaultDuration} 分鐘</span>
                <span className={`pillar-intensity ${INTENSITY_COLORS[pillar.defaultIntensity]}`}>
                  {INTENSITY_LABELS[pillar.defaultIntensity]}
                </span>
              </div>
              {pillar.exampleExercises.length > 0 && (
                <div className="pillar-exercises">
                  範例: {pillar.exampleExercises.slice(0, 3).join("、")}
                  {pillar.exampleExercises.length > 3 && "..."}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="btn-row">
          <button
            className="btn-secondary"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            {isLoading ? "重新產生中..." : "🔄 換一個計畫"}
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            確認開始 →
          </button>
        </div>
      </div>
    );
  }

  // Legacy 7-day plan view
  if (!plan) {
    return (
      <div className="step-container plan-review">
        <h1 className="step-title">載入計畫中...</h1>
      </div>
    );
  }

  return (
    <div className="step-container plan-review">
      <h1 className="step-title">你的訓練計畫</h1>
      <p className="step-subtitle">{plan.plan_summary}</p>

      <div className="weekly-goal">
        <span className="goal-icon">🎯</span>
        <span>本週目標：{plan.weekly_goal}</span>
      </div>

      <div className="week-overview">
        {plan.week_overview.map((day) => (
          <div key={day.day} className={`day-card ${INTENSITY_COLORS[day.intensity]}`}>
            <div className="day-header">
              <span className="day-number">Day {day.day}</span>
              <span className="day-label">週{DAY_LABELS[day.day - 1]}</span>
            </div>
            <div className="day-focus">{day.focus}</div>
            <div className="day-meta">
              <span className="day-duration">{day.duration} 分鐘</span>
              <span className={`day-intensity ${INTENSITY_COLORS[day.intensity]}`}>
                {INTENSITY_LABELS[day.intensity]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button
          className="btn-secondary"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          {isLoading ? "重新產生中..." : "🔄 換一個計畫"}
        </button>
        <button
          className="btn-primary"
          onClick={onConfirm}
          disabled={isLoading}
        >
          確認開始 →
        </button>
      </div>
    </div>
  );
}
