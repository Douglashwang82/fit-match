interface Props {
  theme: "light" | "dark";
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={theme === "dark" ? "切換為亮色模式" : "切換為暗色模式"}
      title={theme === "dark" ? "切換為亮色模式" : "切換為暗色模式"}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      {theme === "dark" ? "亮色" : "暗色"}
    </button>
  );
}
