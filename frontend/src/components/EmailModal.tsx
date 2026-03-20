import { useState } from "react";
import { joinWaitlist } from "../api";

interface Props {
  userGoal: string;
  onClose: () => void;
}

export default function EmailModal({ userGoal, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError("請輸入有效的 Email 地址");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await joinWaitlist(email, userGoal);
      setSubmitted(true);
    } catch {
      setError("送出失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {submitted ? (
          <div className="modal-success">
            <div className="success-icon">🎉</div>
            <h3>你已成功加入！</h3>
            <p>我們會在開放測試時第一時間通知 <strong>{email}</strong></p>
            <p className="success-hint">早期測試用戶享有終身 7 折優惠</p>
            <button className="btn-primary" onClick={onClose}>太棒了！</button>
          </div>
        ) : (
          <>
            <h3 className="modal-title">你差一步就完成了</h3>
            <p className="modal-subtitle">
              SyncMotion 的「每日主動 AI 追蹤功能」目前正在限量封閉測試。
              留下 Email，下週優先為你開通，並享有早期用戶終身 7 折優惠。
            </p>

            <input
              type="email"
              className="email-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {error && <p className="input-error">{error}</p>}

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "送出中…" : "取得早期使用權限"}
            </button>

            <p className="modal-fine-print">不會收到垃圾郵件，隨時可取消訂閱</p>
          </>
        )}
      </div>
    </div>
  );
}
