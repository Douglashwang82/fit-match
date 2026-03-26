import { useState } from "react";
import type { Gender, FitnessLevel } from "../../types";

interface BodyInfo {
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  fitnessLevel: FitnessLevel;
  injuries: string[];
}

interface Props {
  onNext: (data: BodyInfo) => void;
  initialData?: Partial<BodyInfo>;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "其他" },
];

const FITNESS_OPTIONS: { value: FitnessLevel; label: string; desc: string }[] = [
  { value: "beginner", label: "初學者", desc: "剛開始運動或休息很久" },
  { value: "intermediate", label: "中級", desc: "規律運動 6 個月以上" },
  { value: "advanced", label: "進階", desc: "規律運動 2 年以上" },
];

const COMMON_INJURIES = ["膝蓋", "下背", "肩膀", "手腕", "腳踝"];

export default function BodyInfoStep({ onNext, initialData }: Props) {
  const [age, setAge] = useState(initialData?.age || 30);
  const [gender, setGender] = useState<Gender | null>(initialData?.gender || null);
  const [weight, setWeight] = useState(initialData?.weight || 70);
  const [height, setHeight] = useState(initialData?.height || 170);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(
    initialData?.fitnessLevel || null
  );
  const [injuries, setInjuries] = useState<string[]>(initialData?.injuries || []);

  const toggleInjury = (injury: string) => {
    setInjuries((prev) =>
      prev.includes(injury) ? prev.filter((i) => i !== injury) : [...prev, injury]
    );
  };

  const isValid = gender && fitnessLevel && age > 0 && weight > 0 && height > 0;

  const handleSubmit = () => {
    if (isValid) {
      onNext({ age, gender, weight, height, fitnessLevel, injuries });
    }
  };

  return (
    <div className="step-container">
      <div className="step-badge">Step 1 / 3</div>
      <h1 className="step-title">讓我們認識你</h1>
      <p className="step-subtitle">這些資訊會幫助我為你打造更適合的訓練計畫</p>

      <div className="section">
        <p className="section-label">基本資料</p>
        <div className="form-row">
          <div className="form-field">
            <label>年齡</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              min={10}
              max={100}
            />
          </div>
          <div className="form-field">
            <label>體重 (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              min={30}
              max={200}
            />
          </div>
          <div className="form-field">
            <label>身高 (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              min={100}
              max={250}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <p className="section-label">性別</p>
        <div className="tag-group">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`tag-pill ${gender === opt.value ? "active" : ""}`}
              onClick={() => setGender(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">運動經驗</p>
        <div className="fitness-group">
          {FITNESS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`fitness-card ${fitnessLevel === opt.value ? "active" : ""}`}
              onClick={() => setFitnessLevel(opt.value)}
            >
              <span className="fitness-label">{opt.label}</span>
              <span className="fitness-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <p className="section-label">有任何舊傷或需要注意的地方嗎？（可複選）</p>
        <div className="tag-group">
          {COMMON_INJURIES.map((injury) => (
            <button
              key={injury}
              className={`tag-pill ${injuries.includes(injury) ? "active" : ""}`}
              onClick={() => toggleInjury(injury)}
            >
              {injury}
            </button>
          ))}
          <button
            className={`tag-pill ${injuries.length === 0 ? "active" : ""}`}
            onClick={() => setInjuries([])}
          >
            都沒有
          </button>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={!isValid}>
        下一步 →
      </button>
    </div>
  );
}
