import { useState } from "react";
import type { DailyWorkout, WorkoutDifficulty } from "../types";

interface Props {
  workout: DailyWorkout;
  onComplete: (difficulty: WorkoutDifficulty, notes?: string) => void;
  onSkip: () => void;
}

const DIFFICULTY_OPTIONS: {
  value: WorkoutDifficulty;
  label: string;
  emoji: string;
}[] = [
  { value: "too_easy", label: "太簡單", emoji: "😌" },
  { value: "just_right", label: "剛剛好", emoji: "💪" },
  { value: "too_hard", label: "太難了", emoji: "😰" },
];

export default function WorkoutView({
  workout,
  onComplete,
  onSkip,
}: Props) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [difficulty, setDifficulty] = useState<WorkoutDifficulty | null>(null);
  const [notes, setNotes] = useState("");

  const handleFinish = () => {
    setShowFeedback(true);
  };

  const handleSubmitFeedback = () => {
    if (difficulty) {
      onComplete(difficulty, notes || undefined);
    }
  };

  if (showFeedback) {
    return (
      <div className="step-container">
        <h1 className="step-title">訓練完成！</h1>
        <p className="step-subtitle">這次的訓練感覺如何？</p>

        <div className="feedback-options">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`feedback-card ${difficulty === opt.value ? "active" : ""}`}
              onClick={() => setDifficulty(opt.value)}
            >
              <span className="feedback-emoji">{opt.emoji}</span>
              <span className="feedback-label">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="section">
          <textarea
            className="feedback-notes"
            placeholder="有什麼想記錄的嗎？（選填）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleSubmitFeedback}
          disabled={!difficulty}
        >
          儲存並返回 →
        </button>
      </div>
    );
  }

  return (
    <div className="step-container workout-view">
      <div className="workout-header">
        <span className="workout-day">Day {workout.dayNumber}</span>
        <span className="workout-duration">{workout.estimatedDuration} 分鐘</span>
      </div>

      <div className="motivation-box">
        <p>{workout.motivationMessage}</p>
      </div>

      <div className="workout-section">
        <h3 className="section-title">熱身</h3>
        <p className="warmup-text">{workout.warmup}</p>
      </div>

      <div className="workout-section">
        <h3 className="section-title">主訓練</h3>
        <div className="exercise-list">
          {workout.exercises.map((exercise, idx) => (
            <div key={idx} className="exercise-card">
              <div className="exercise-header">
                <span className="exercise-number">{idx + 1}</span>
                <span className="exercise-name">{exercise.name}</span>
              </div>
              <div className="exercise-details">
                {exercise.sets && exercise.reps && (
                  <span className="exercise-volume">
                    {exercise.sets} 組 × {exercise.reps}
                  </span>
                )}
                {exercise.duration_seconds && (
                  <span className="exercise-duration">
                    {exercise.duration_seconds} 秒
                  </span>
                )}
                {exercise.rest_seconds && (
                  <span className="exercise-rest">
                    休息 {exercise.rest_seconds} 秒
                  </span>
                )}
              </div>
              {exercise.notes && (
                <p className="exercise-notes">{exercise.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="workout-section">
        <h3 className="section-title">收操</h3>
        <p className="cooldown-text">{workout.cooldown}</p>
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={onSkip}>
          跳過今天
        </button>
        <button className="btn-primary" onClick={handleFinish}>
          完成訓練 ✓
        </button>
      </div>
    </div>
  );
}
