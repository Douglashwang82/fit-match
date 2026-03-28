import type { PillarBasedPlan } from "../types";

interface Props {
  pillarPlan: PillarBasedPlan;
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

export default function PlanReview({
  pillarPlan,
  onConfirm,
  onRegenerate,
  isLoading,
}: Props) {
  const totalFrequency = pillarPlan.pillars.reduce(
    (sum, p) => sum + p.targetFrequency,
    0
  );

  return (
    <div className="step-container plan-review">
      <h1 className="step-title">專屬於你的訓練</h1>
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
