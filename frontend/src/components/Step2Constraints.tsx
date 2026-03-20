import { useState } from "react";
import type { EnergyLevel } from "../types";

interface Props {
  onNext: (daysPerWeek: number, energyLevel: EnergyLevel) => void;
  onBack: () => void;
}

const DAYS = [2, 3, 4, 5];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string; color: string }[] = [
  { value: "energized", label: "充滿活力", emoji: "⚡️", color: "energy-green" },
  { value: "tired", label: "有點疲勞", emoji: "🌙", color: "energy-yellow" },
  { value: "exhausted", label: "快撐不住了", emoji: "😮‍💨", color: "energy-red" },
];

export default function Step2Constraints({ onNext, onBack }: Props) {
  const [days, setDays] = useState<number>(3);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);

  const handleSubmit = () => {
    if (energy) onNext(days, energy);
  };

  return (
    <div className="step-container">
      <div className="step-badge">Step 2 / 2</div>
      <h1 className="step-title">告訴我今天的狀況</h1>

      <div className="section">
        <p className="section-label">這週你打算運動幾天？</p>
        <div className="tag-group">
          {DAYS.map((d) => (
            <button
              key={d}
              className={`tag-pill ${days === d ? "active" : ""}`}
              onClick={() => setDays(d)}
            >
              {d} 天
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">老實說，你現在感覺如何？</p>
        <div className="energy-group">
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`energy-card ${opt.color} ${energy === opt.value ? "active" : ""}`}
              onClick={() => setEnergy(opt.value)}
            >
              <span className="energy-emoji">{opt.emoji}</span>
              <span className="energy-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={onBack}>
          ← 返回
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!energy}
        >
          幫我排計畫 →
        </button>
      </div>
    </div>
  );
}
