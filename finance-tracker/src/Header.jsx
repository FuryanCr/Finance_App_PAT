import { translations } from './lib/translations'

export default function Header({ lang }) {
  const t = translations[lang]

  return (
    <header className="header">
      <h1 className="title">
        {t.titleMain} <span className="title-accent">{t.titleAccent}</span>
      </h1>
    </header>
  )
}