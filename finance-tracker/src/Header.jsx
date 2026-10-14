import { useSettings } from './context/useSettings'
import Logo from './components/Logo'

// Bar with the logo and the name, for the screens shown before the app is
// ready (loading, blocked, error). It has no tabs: nothing works yet.
export default function Header() {
  const { t } = useSettings()

  return (
    <header className="app-bar app-bar--lite">
      <span className="brand">
        <Logo />
        <h1 className="brand-name">
          {t('titleMain')} <span className="title-accent">{t('titleAccent')}</span>
        </h1>
      </span>
    </header>
  )
}
