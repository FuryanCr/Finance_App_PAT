import { useEffect, useState } from 'react'
import { SettingsContext } from './SettingsContext'
import { readPref, writePref } from '../lib/prefs'
import { translations } from '../lib/translations'

export default function SettingsProvider({ children }) {
  // Spanish (Costa Rica) unless English was saved. Only a choice made in
  // Settings is written, so a fresh install is never pinned to the default.
  const [lang, setLangState] = useState(() =>
    readPref('lang') === 'en' ? 'en' : 'es',
  )
  // dark unless light was saved
  const [theme, setTheme] = useState(() =>
    readPref('theme') === 'light' ? 'light' : 'dark',
  )

  const setLang = (next) => {
    writePref('lang', next)
    setLangState(next)
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'es' ? 'es-CR' : 'en'
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
