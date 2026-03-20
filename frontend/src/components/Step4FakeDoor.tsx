import { useState, useEffect } from "react";
import type { WorkoutData } from "../types";
import { getWaitlistCount } from "../api";
import EmailModal from "./EmailModal";

// Placeholder blurred days
const BLURRED_DAYS = [
  { label: "有氧間歇訓練", exercises: "跑步機衝刺 × 深蹲跳 × 波比跳" },
  { label: "上肢肌力訓練", exercises: "伏地挺身 × 划船 × 肩推" },
  { label: "主動恢復日", exercises: "瑜珈流動 × 深層拉伸" },
  { label: "下肢爆發力", exercises: "保加利亞分腿蹲 × 臀推 × 弓步跳" },
  { label: "核心穩定訓練", exercises: "棒式系列 × 死蟲 × 側棒支撐" },
  { label: "全身循環訓練", exercises: "壺鈴擺盪 × 土耳其起立 × 農夫走路" },
  { label: "速度 & 敏捷日", exercises: "梯形訓練 × 側向跨步 × 反應訓練" },
];

interface Props {
  workoutData: WorkoutData;
  userGoal: string;
}

export default function Step4FakeDoor({ workoutData, userGoal }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [count, setCount] = useState(47);

  useEffect(() => {
    getWaitlistCount()
      .then((c) => { if (c > 0) setCount(c); })
      .catch(() => {});
  }, []);

  return (
    <div className="step-container plan-container">
      <h2 className="plan-title">你的 30 天 SyncMotion 計畫</h2>

      {/* Day 1 — visible */}
      <div className="day-card day-visible">
        <div className="day-badge">DAY 1 ✓</div>
        <div className="exercise-grid-sm">
          {workoutData.day1_workout.map((ex, i) => (
            <div key={i} className="exercise-chip">
              <span className="chip-name">{ex.name}</span>
              {ex.sets && ex.reps && (
                <span className="chip-meta">{ex.sets}×{ex.reps}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Days 2–8 — blurred */}
      {BLURRED_DAYS.map((day, i) => (
        <div key={i} className="day-card day-blurred">
          <div className="day-badge">DAY {i + 2}</div>
          <div className="blurred-content">
            <div className="blurred-label">{day.label}</div>
            <div className="blurred-exercises">{day.exercises}</div>
          </div>
          <div className="lock-overlay">🔒</div>
        </div>
      ))}

      <div className="more-days-hint">…以及第 9 天到第 30 天的完整動態計畫</div>

      {/* Sticky CTA */}
      <div className="sticky-cta">
        <button className="btn-primary btn-large btn-glow" onClick={() => setShowModal(true)}>
          解鎖完整 30 天動態計畫
        </button>
        <p className="social-proof">已有 {count} 位用戶搶先加入等候名單</p>
      </div>

      {showModal && (
        <EmailModal
          userGoal={userGoal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
