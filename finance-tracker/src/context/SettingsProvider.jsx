import { useEffect, useState } from 'react'
import { SettingsContext } from './SettingsContext'
import { readPref, writePref } from '../lib/prefs'
import { translations } from '../lib/translations'

export default function SettingsProvider({ children }) {
  // English unless Spanish was saved
  const [lang, setLang] = useState(() =>
    readPref('lang') === 'es' ? 'es' : 'en',
  )
  // dark unless light was saved
  const [theme, setTheme] = useState(() =>
    readPref('theme') === 'light' ? 'light' : 'dark',
  )

  useEffect(() => {
    writePref('lang', lang)
    document.documentElement.lang = lang
    document.title = `${translations[lang].titleMain} ${translations[lang].titleAccent}`
  }, [lang])

  useEffect(() => {
    writePref('theme', theme)
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
