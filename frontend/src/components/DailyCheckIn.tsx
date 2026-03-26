import { useState } from "react";
import type { DailyEnergyLevel } from "../types";

interface Props {
  onSubmit: (energy: DailyEnergyLevel) => void;
  onBack: () => void;
  isLoading: boolean;
}

const ENERGY_OPTIONS: {
  value: DailyEnergyLevel;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  {
    value: "high",
    label: "精神很好",
    emoji: "⚡️",
    desc: "睡得好，準備全力以赴",
  },
  {
    value: "medium",
    label: "還可以",
    emoji: "🙂",
    desc: "正常狀態，可以運動",
  },
  {
    value: "low",
    label: "有點累",
    emoji: "😴",
    desc: "狀態不佳，希望輕鬆一點",
  },
];

export default function DailyCheckIn({ onSubmit, onBack, isLoading }: Props) {
  const [energy, setEnergy] = useState<DailyEnergyLevel | null>(null);

  const handleSubmit = () => {
    if (energy) {
      onSubmit(energy);
    }
  };

  return (
    <div className="step-container">
      <h1 className="step-title">今天感覺如何？</h1>
      <p className="step-subtitle">讓我根據你的狀態調整今天的訓練強度</p>

      <div className="checkin-options">
        {ENERGY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`checkin-card ${energy === opt.value ? "active" : ""}`}
            onClick={() => setEnergy(opt.value)}
          >
            <span className="checkin-emoji">{opt.emoji}</span>
            <span className="checkin-label">{opt.label}</span>
            <span className="checkin-desc">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={onBack} disabled={isLoading}>
          ← 返回
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!energy || isLoading}
        >
          {isLoading ? "產生訓練中..." : "開始訓練 →"}
        </button>
      </div>
    </div>
  );
}
