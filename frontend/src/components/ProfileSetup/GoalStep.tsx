import { useState, useEffect } from "react";

interface GoalData {
  goal: string;
  targetDaysPerWeek: number;
}

interface Props {
  onNext: (data: GoalData) => void;
  onBack: () => void;
  initialData?: Partial<GoalData>;
}

const PLACEHOLDERS = [
  "準備我的第一場半馬賽事…",
  "三個月後把體脂降到 15%…",
  "建立明顯的肌肉線條…",
  "滑雪季前強化下肢肌力…",
  "每週跑步，找回身心平衡…",
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function GoalStep({ onNext, onBack, initialData }: Props) {
  const [goal, setGoal] = useState(initialData?.goal || "");
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(
    initialData?.targetDaysPerWeek || 3
  );
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const isValid = goal.trim().length >= 5;

  const handleSubmit = () => {
    if (isValid) {
      onNext({ goal: goal.trim(), targetDaysPerWeek });
    }
  };

  return (
    <div className="step-container">
      <div className="step-badge">Step 3 / 3</div>
      <h1 className="step-title">你的目標是什麼？</h1>
      <p className="step-subtitle">告訴我你想達成的事，我來幫你規劃專屬計畫</p>

      <div className="section">
        <div className="input-group">
          <textarea
            className="goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <p className="input-hint">
            {goal.trim().length < 5
              ? `還需要 ${Math.max(0, 5 - goal.trim().length)} 個字`
              : "✓ 看起來不錯！"}
          </p>
        </div>
      </div>

      <div className="section">
        <p className="section-label">每週想運動幾天？</p>
        <div className="tag-group">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              className={`tag-pill ${targetDaysPerWeek === d ? "active" : ""}`}
              onClick={() => setTargetDaysPerWeek(d)}
            >
              {d} 天
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={onBack}>
          ← 返回
        </button>
        <button className="btn-primary" onClick={handleSubmit} disabled={!isValid}>
          產生訓練計畫 →
        </button>
      </div>
    </div>
  );
}
