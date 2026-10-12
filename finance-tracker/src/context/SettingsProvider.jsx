import { useEffect, useState } from 'react'
import { SettingsContext } from './SettingsContext'
import { translations } from '../lib/translations'

// Storage can be blocked: reading gives null, writing does nothing
function readSetting(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // blocked: the setting just is not remembered
  }
}

export default function SettingsProvider({ children }) {
  // English unless Spanish was saved
  const [lang, setLang] = useState(() =>
    readSetting('lang') === 'es' ? 'es' : 'en',
  )
  // dark unless light was saved
  const [theme, setTheme] = useState(() =>
    readSetting('theme') === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    writeSetting('lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    writeSetting('theme', theme)
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
