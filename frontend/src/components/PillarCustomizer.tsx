import { useState } from "react";
import type { TrainingPillar, Intensity } from "../types";

interface Props {
  pillars: TrainingPillar[];
  onSave: (pillars: TrainingPillar[]) => void;
  onCancel: () => void;
}

const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: "low", label: "輕鬆" },
  { value: "medium", label: "中等" },
  { value: "high", label: "高強度" },
];

export default function PillarCustomizer({ pillars, onSave, onCancel }: Props) {
  const [editedPillars, setEditedPillars] = useState<TrainingPillar[]>([
    ...pillars,
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleUpdatePillar = (
    index: number,
    updates: Partial<TrainingPillar>
  ) => {
    const newPillars = [...editedPillars];
    newPillars[index] = { ...newPillars[index], ...updates };
    setEditedPillars(newPillars);
  };

  const handleRemovePillar = (index: number) => {
    if (editedPillars.length <= 1) {
      alert("至少需要保留一個訓練支柱");
      return;
    }
    setEditedPillars(editedPillars.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleAddPillar = () => {
    const newPillar: TrainingPillar = {
      id: `custom-${Date.now()}`,
      name: "新訓練支柱",
      description: "自訂支柱描述",
      targetFrequency: 1,
      exampleExercises: [],
      defaultDuration: 30,
      defaultIntensity: "medium",
    };
    setEditedPillars([...editedPillars, newPillar]);
    setEditingIndex(editedPillars.length);
  };

  const totalFrequency = editedPillars.reduce(
    (sum, p) => sum + p.targetFrequency,
    0
  );

  return (
    <div className="pillar-customizer">
      <h3>自訂訓練支柱</h3>
      <p className="customizer-hint">
        調整支柱以符合你的需求 (每週總計: {totalFrequency} 次)
      </p>

      <div className="pillar-list">
        {editedPillars.map((pillar, index) => (
          <div key={pillar.id} className="pillar-edit-card">
            {editingIndex === index ? (
              <PillarEditForm
                pillar={pillar}
                onUpdate={(updates) => handleUpdatePillar(index, updates)}
                onDone={() => setEditingIndex(null)}
              />
            ) : (
              <PillarPreview
                pillar={pillar}
                onEdit={() => setEditingIndex(index)}
                onRemove={() => handleRemovePillar(index)}
              />
            )}
          </div>
        ))}
      </div>

      <button className="btn-add-pillar" onClick={handleAddPillar}>
        + 新增支柱
      </button>

      <div className="customizer-actions">
        <button className="btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button
          className="btn-primary"
          onClick={() => onSave(editedPillars)}
          disabled={editedPillars.length === 0}
        >
          儲存變更
        </button>
      </div>
    </div>
  );
}

function PillarEditForm({
  pillar,
  onUpdate,
  onDone,
}: {
  pillar: TrainingPillar;
  onUpdate: (updates: Partial<TrainingPillar>) => void;
  onDone: () => void;
}) {
  return (
    <div className="pillar-edit-form">
      <div className="form-field">
        <label>名稱</label>
        <input
          type="text"
          value={pillar.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="支柱名稱"
        />
      </div>

      <div className="form-field">
        <label>描述</label>
        <textarea
          value={pillar.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="描述這個支柱的目的"
          rows={2}
        />
      </div>

      <div className="form-row-inline">
        <div className="form-field">
          <label>每週目標</label>
          <input
            type="number"
            min={1}
            max={7}
            value={pillar.targetFrequency}
            onChange={(e) =>
              onUpdate({ targetFrequency: parseInt(e.target.value) || 1 })
            }
          />
        </div>

        <div className="form-field">
          <label>預設時長 (分鐘)</label>
          <input
            type="number"
            min={10}
            max={120}
            value={pillar.defaultDuration}
            onChange={(e) =>
              onUpdate({ defaultDuration: parseInt(e.target.value) || 30 })
            }
          />
        </div>

        <div className="form-field">
          <label>預設強度</label>
          <select
            value={pillar.defaultIntensity}
            onChange={(e) =>
              onUpdate({ defaultIntensity: e.target.value as Intensity })
            }
          >
            {INTENSITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label>範例動作 (用逗號分隔)</label>
        <input
          type="text"
          value={pillar.exampleExercises.join(", ")}
          onChange={(e) =>
            onUpdate({
              exampleExercises: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="例如: 深蹲, 硬舉, 弓箭步"
        />
      </div>

      <button className="btn-done" onClick={onDone}>
        完成編輯
      </button>
    </div>
  );
}

function PillarPreview({
  pillar,
  onEdit,
  onRemove,
}: {
  pillar: TrainingPillar;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="pillar-preview">
      <div className="preview-header">
        <span className="preview-name">{pillar.name}</span>
        <span className="preview-freq">{pillar.targetFrequency}x/週</span>
      </div>
      <p className="preview-desc">{pillar.description}</p>
      {pillar.exampleExercises.length > 0 && (
        <p className="preview-exercises">
          動作: {pillar.exampleExercises.slice(0, 3).join("、")}
          {pillar.exampleExercises.length > 3 && "..."}
        </p>
      )}
      <div className="preview-actions">
        <button className="btn-edit" onClick={onEdit}>
          編輯
        </button>
        <button className="btn-remove" onClick={onRemove}>
          移除
        </button>
      </div>
    </div>
  );
}
