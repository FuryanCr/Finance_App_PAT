import { useEffect, useState } from 'react'
import { SettingsContext } from './SettingsContext'
import { translations } from '../lib/translations'

function getInitialTheme() {
  const saved = localStorage.getItem('theme')
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export default function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'es')
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  const t = (key) => translations[lang][key] ?? key

  return (
    <SettingsContext.Provider value={{ lang, setLang, theme, setTheme, t }}>
      {children}
    </SettingsContext.Provider>
  )
}
