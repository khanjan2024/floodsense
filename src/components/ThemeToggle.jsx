import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      className="navbar-theme-toggle"
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => void toggleTheme()}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === 'light' ? '☾' : '☀'}
      </span>
    </button>
  )
}