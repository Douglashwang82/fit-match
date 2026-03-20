import { useEffect, useState } from "react";
import type { WorkoutData } from "../types";

const LOADING_MESSAGES = [
  "分析你的目標中…",
  "設計專屬訓練動作…",
  "計算最佳訓練量…",
  "個人化你的課表…",
  "最後調整中…",
];

interface Props {
  workoutData: WorkoutData | null;
  isLoading: boolean;
  error: string | null;
  onNext: () => void;
  onRetry: () => void;
}

export default function Step3AhaMoment({ workoutData, isLoading, error, onNext, onRetry }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    setProgress(0);
    setMsgIdx(0);

    const msgId = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 600);

    const progId = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + 3;
      });
    }, 80);

    return () => {
      clearInterval(msgId);
      clearInterval(progId);
    };
  }, [isLoading]);

  useEffect(() => {
    if (workoutData) setProgress(100);
  }, [workoutData]);

  if (error) {
    return (
      <div className="step-container">
        <div className="error-box">
          <p>哎呀，AI 暫時忙碌中 😅</p>
          <p className="error-detail">{error}</p>
          <button className="btn-primary" onClick={onRetry}>重試</button>
        </div>
      </div>
    );
  }

  if (isLoading || !workoutData) {
    return (
      <div className="step-container loading-container">
        <div className="loading-icon">🤖</div>
        <h2 className="loading-title">AI 正在為你量身打造…</h2>
        <p className="loading-msg">{LOADING_MESSAGES[msgIdx]}</p>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="step-container results-container">
      <blockquote className="motivation-quote">
        "{workoutData.motivation_message}"
      </blockquote>
      <p className="workout-summary">{workoutData.workout_summary}</p>

      <div className="section-divider" />
      <h3 className="section-heading">DAY 1 訓練計畫</h3>

      <div className="exercise-grid">
        {workoutData.day1_workout.map((ex, i) => (
          <div key={i} className="exercise-card">
            <div className="exercise-name">{ex.name}</div>
            <div className="exercise-meta">
              {ex.sets && ex.reps && <span>{ex.sets} 組 × {ex.reps}</span>}
              {ex.duration_seconds && <span>{ex.duration_seconds} 秒</span>}
              <span className="exercise-rest">休息 {ex.rest_seconds}s</span>
            </div>
            {ex.notes && <div className="exercise-notes">{ex.notes}</div>}
          </div>
        ))}
      </div>

      <button className="btn-primary btn-large" onClick={onNext}>
        查看完整 30 天計畫 →
      </button>
    </div>
  );
}
