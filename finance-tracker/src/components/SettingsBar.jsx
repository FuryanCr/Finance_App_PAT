import { useSettings } from '../context/useSettings'

export default function SettingsBar() {
  const { lang, setLang, theme, setTheme, t } = useSettings()

  return (
    <header className="settings-bar">
      <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
        {lang === 'es' ? 'EN' : 'ES'}
      </button>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? t('light') : t('dark')}
      </button>
    </header>
  )
}