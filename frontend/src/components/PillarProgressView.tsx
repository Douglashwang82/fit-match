import type { PillarProgress, TrainingPillar, Intensity } from "../types";

interface Props {
  pillarProgress: PillarProgress[];
  onPillarClick: (pillar: TrainingPillar) => void;
  onCustomize: () => void;
}

const INTENSITY_LABELS: Record<Intensity, string> = {
  low: "輕鬆",
  medium: "中等",
  high: "高強度",
};

export default function PillarProgressView({
  pillarProgress,
  onPillarClick,
  onCustomize,
}: Props) {
  return (
    <div className="pillar-progress-view">
      <div className="pillar-header">
        <h3>訓練專項</h3>
        <button className="btn-customize" onClick={onCustomize}>
          自訂
        </button>
      </div>

      <p className="pillar-hint">點擊支柱開始訓練</p>

      <div className="pillar-grid">
        {pillarProgress.map((progress) => {
          const {
            pillar,
            completionPercentage,
            completionsInWindow,
            lastTrainedDate,
            recommendedIntensity,
            daysUntilStale,
          } = progress;

          const isUrgent = completionPercentage < 50 && daysUntilStale <= 2;
          const isComplete = completionPercentage >= 100;

          return (
            <div
              key={pillar.id}
              className={`pillar-card ${isUrgent ? "urgent" : ""} ${isComplete ? "complete" : ""}`}
              onClick={() => onPillarClick(pillar)}
            >
              <div className="pillar-card-header">
                <span className="pillar-name">{pillar.name}</span>
                <span className="pillar-frequency">
                  {completionsInWindow}/{pillar.targetFrequency}
                </span>
              </div>

              <p className="pillar-description">{pillar.description}</p>

              {/* Progress Bar */}
              <div className="pillar-progress-bar">
                <div
                  className="pillar-progress-fill"
                  style={{ width: `${Math.min(100, completionPercentage)}%` }}
                />
              </div>
              <span className="pillar-percentage">
                {Math.round(completionPercentage)}%
              </span>

              <div className="pillar-meta">
                <span className="pillar-last-trained">
                  {lastTrainedDate
                    ? `上次: ${formatRelativeDate(lastTrainedDate)}`
                    : "尚未訓練"}
                </span>
                <span
                  className={`pillar-intensity intensity-${recommendedIntensity}`}
                >
                  建議: {INTENSITY_LABELS[recommendedIntensity]}
                </span>
              </div>

              {isUrgent && (
                <div className="pillar-urgent-badge">需要訓練!</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  return dateStr;
}
