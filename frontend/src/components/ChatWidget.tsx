import { useState, useRef, useEffect } from "react";
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  onSendMessage: (messages: ChatMessage[]) => Promise<string>;
}

export default function ChatWidget({ onSendMessage }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "嗨！我是你的專屬教練。有任何關於訓練、營養或恢復的問題都可以問我！",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await onSendMessage(newMessages);
      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "抱歉，發生了一些問題。請稍後再試。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className={`chat-toggle ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "關閉對話" : "開啟對話"}
      >
        {isOpen ? "✕" : "💬"}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-avatar">🏋️</span>
              <div>
                <h3>SyncMotion 教練</h3>
                <span className="chat-status">隨時為你解答</span>
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}
              >
                {msg.role === "assistant" && (
                  <span className="message-avatar">🏋️</span>
                )}
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant">
                <span className="message-avatar">🏋️</span>
                <div className="message-content typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入訊息..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
