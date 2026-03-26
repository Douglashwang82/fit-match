import { useState } from "react";
import type { WorkSchedule, DietType } from "../../types";

interface HabitsData {
  currentFrequency: number;
  preferredExercises: string[];
  sleepHours: number;
  workSchedule: WorkSchedule;
  dietType: DietType;
}

interface Props {
  onNext: (data: HabitsData) => void;
  onBack: () => void;
  initialData?: Partial<HabitsData>;
}

const FREQUENCY_OPTIONS = [0, 1, 2, 3, 4, 5];

const EXERCISE_OPTIONS = [
  { value: "running", label: "跑步" },
  { value: "weights", label: "重訓" },
  { value: "yoga", label: "瑜珈" },
  { value: "swimming", label: "游泳" },
  { value: "cycling", label: "騎車" },
  { value: "hiit", label: "HIIT" },
  { value: "sports", label: "球類運動" },
  { value: "walking", label: "健走" },
];

const SCHEDULE_OPTIONS: { value: WorkSchedule; label: string; emoji: string }[] = [
  { value: "morning", label: "早上", emoji: "🌅" },
  { value: "afternoon", label: "下午", emoji: "☀️" },
  { value: "evening", label: "晚上", emoji: "🌙" },
  { value: "flexible", label: "彈性", emoji: "🔄" },
];

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: "standard", label: "一般飲食" },
  { value: "vegetarian", label: "素食" },
  { value: "vegan", label: "純素" },
  { value: "keto", label: "生酮" },
  { value: "other", label: "其他" },
];

const SLEEP_OPTIONS = [5, 6, 7, 8, 9];

export default function HabitsStep({ onNext, onBack, initialData }: Props) {
  const [currentFrequency, setCurrentFrequency] = useState(
    initialData?.currentFrequency ?? 2
  );
  const [preferredExercises, setPreferredExercises] = useState<string[]>(
    initialData?.preferredExercises || []
  );
  const [sleepHours, setSleepHours] = useState(initialData?.sleepHours || 7);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(
    initialData?.workSchedule || null
  );
  const [dietType, setDietType] = useState<DietType | null>(
    initialData?.dietType || null
  );

  const toggleExercise = (exercise: string) => {
    setPreferredExercises((prev) =>
      prev.includes(exercise)
        ? prev.filter((e) => e !== exercise)
        : [...prev, exercise]
    );
  };

  const isValid = workSchedule && dietType;

  const handleSubmit = () => {
    if (isValid) {
      onNext({
        currentFrequency,
        preferredExercises,
        sleepHours,
        workSchedule,
        dietType,
      });
    }
  };

  return (
    <div className="step-container">
      <div className="step-badge">Step 2 / 3</div>
      <h1 className="step-title">你的生活習慣</h1>
      <p className="step-subtitle">了解你的日常，讓計畫更符合你的生活</p>

      <div className="section">
        <p className="section-label">目前每週運動幾天？</p>
        <div className="tag-group">
          {FREQUENCY_OPTIONS.map((freq) => (
            <button
              key={freq}
              className={`tag-pill ${currentFrequency === freq ? "active" : ""}`}
              onClick={() => setCurrentFrequency(freq)}
            >
              {freq === 0 ? "幾乎沒有" : `${freq} 天`}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">喜歡的運動類型（可複選）</p>
        <div className="tag-group">
          {EXERCISE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`tag-pill ${preferredExercises.includes(opt.value) ? "active" : ""}`}
              onClick={() => toggleExercise(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">平均睡眠時間</p>
        <div className="tag-group">
          {SLEEP_OPTIONS.map((hours) => (
            <button
              key={hours}
              className={`tag-pill ${sleepHours === hours ? "active" : ""}`}
              onClick={() => setSleepHours(hours)}
            >
              {hours} 小時
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">什麼時候最方便運動？</p>
        <div className="energy-group">
          {SCHEDULE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`energy-card ${workSchedule === opt.value ? "active" : ""}`}
              onClick={() => setWorkSchedule(opt.value)}
            >
              <span className="energy-emoji">{opt.emoji}</span>
              <span className="energy-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">飲食型態</p>
        <div className="tag-group">
          {DIET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`tag-pill ${dietType === opt.value ? "active" : ""}`}
              onClick={() => setDietType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={onBack}>
          ← 返回
        </button>
        <button className="btn-primary" onClick={handleSubmit} disabled={!isValid}>
          下一步 →
        </button>
      </div>
    </div>
  );
}
