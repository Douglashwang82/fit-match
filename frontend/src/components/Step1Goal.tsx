import { useState, useEffect } from "react";

const PLACEHOLDERS = [
  "準備我的第一場半馬賽事…",
  "三個月後把體脂降到 15%…",
  "建立明顯的肌肉線條…",
  "滑雪季前強化下肢肌力…",
  "每週跑步，找回身心平衡…",
];

interface Props {
  onNext: (goal: string) => void;
}

export default function Step1Goal({ onNext }: Props) {
  const [goal, setGoal] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = () => {
    if (goal.trim().length >= 5) onNext(goal.trim());
  };

  return (
    <div className="step-container">
      <div className="step-badge">Step 1 / 2</div>
      <h1 className="step-title">你的運動目標是什麼？</h1>
      <p className="step-subtitle">告訴我你最想達成的事，我來幫你規劃專屬計畫。</p>

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
          autoFocus
        />
        <p className="input-hint">
          {goal.trim().length < 5
            ? `還需要 ${Math.max(0, 5 - goal.trim().length)} 個字`
            : "✓ 看起來不錯！"}
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={goal.trim().length < 5}
      >
        下一步 →
      </button>
    </div>
  );
}
