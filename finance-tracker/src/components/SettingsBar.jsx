import { useSettings } from '../context/useSettings'

export default function SettingsBar() {
  const { lang, setLang, theme, setTheme, t } = useSettings()

  return (
    <header className="settings-bar">
      <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
        {lang === 'es' ? 'EN' : 'ES'}
      </button>
      <button
        className="theme-toggle"
        type="button"
        aria-label={theme === 'dark' ? t('light') : t('dark')}
        title={theme === 'dark' ? t('light') : t('dark')}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? (
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
          </svg>
        )}
      </button>
    </header>
  )
}