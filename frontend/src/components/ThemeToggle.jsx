import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ variant = 'icon' }) {
  const { isDark, toggleTheme } = useTheme()

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 text-fog-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 px-3 py-2 text-fog-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-[12px] font-medium"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}