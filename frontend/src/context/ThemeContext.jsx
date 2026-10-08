import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Load from localStorage or default to 'dark'
    return localStorage.getItem('rag_theme') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('rag_theme', theme)
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      document.body.style.background = '#0a0e1a'
      document.body.style.color = '#f1f5f9'
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      document.body.style.background = '#f8fafc'
      document.body.style.color = '#0f172a'
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}