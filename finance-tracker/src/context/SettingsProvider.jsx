import { useEffect, useState } from 'react'
import { SettingsContext } from './SettingsContext'
import { translations } from '../lib/translations'

function getInitialTheme() {
  return localStorage.getItem('theme') || 'dark'
}

export default function SettingsProvider({ children }) {
  // English unless Spanish was saved
  const [lang, setLang] = useState(() =>
    localStorage.getItem('lang') === 'es' ? 'es' : 'en',
  )
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
  const locale = lang === 'es' ? 'es-CR' : 'en-US'

  return (
    <SettingsContext.Provider
      value={{ lang, setLang, locale, theme, setTheme, t }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
