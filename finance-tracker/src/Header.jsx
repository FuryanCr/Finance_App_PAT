import { useSettings } from './context/useSettings'

export default function Header() {
  const { t } = useSettings()

  return (
    <header className="header">
      <h1 className="title">
        {t('titleMain')} <span className="title-accent">{t('titleAccent')}</span>
      </h1>
    </header>
  )
}
