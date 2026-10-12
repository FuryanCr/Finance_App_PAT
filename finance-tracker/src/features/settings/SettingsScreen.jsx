import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '../../context/useTransactions'
import { useSettings } from '../../context/useSettings'
import { downloadCsv, transactionRows } from '../../lib/csv'
import { byNewest } from '../../lib/dates'

export default function SettingsScreen() {
  const { lang, setLang, theme, setTheme, t } = useSettings()
  const { transactions, categories, loadSampleData, clearAllData } =
    useTransactions()

  const [busy, setBusy] = useState(false)

  const hasTransactions = transactions.length > 0
  const hasCustomCategories = categories.some((c) => c.name)

  // writes can fail: tell the user instead of failing silently.
  // Only one data action runs at a time.
  const run = async (action) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } catch (error) {
      console.error(error)
      window.alert(t('saveError'))
    } finally {
      setBusy(false)
    }
  }

  const handleExportAll = () => {
    const list = [...transactions].sort(byNewest)
    downloadCsv('quincena-all.csv', transactionRows(list, categories, t))
  }

  const handleClear = () => {
    if (window.confirm(t('confirmClear'))) run(clearAllData)
  }

  return (
    <>
      <h1 className="screen-title">{t('settings')}</h1>

      <section className="card">
        <p className="label">{t('language')}</p>
        <div className="pill-group wrap">
          <button
            type="button"
            className={lang === 'es' ? 'pill active' : 'pill'}
            onClick={() => setLang('es')}
          >
            Español
          </button>
          <button
            type="button"
            className={lang === 'en' ? 'pill active' : 'pill'}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>
      </section>

      <section className="card">
        <p className="label">{t('theme')}</p>
        <div className="pill-group wrap">
          <button
            type="button"
            className={theme === 'dark' ? 'pill active' : 'pill'}
            onClick={() => setTheme('dark')}
          >
            {t('dark')}
          </button>
          <button
            type="button"
            className={theme === 'light' ? 'pill active' : 'pill'}
            onClick={() => setTheme('light')}
          >
            {t('light')}
          </button>
        </div>
      </section>

      <section className="card">
        <p className="label">{t('manage')}</p>
        <div className="actions">
          <Link className="btn secondary" to="/settings/categories">
            {t('categories')}
          </Link>
          <Link className="btn secondary" to="/settings/budgets">
            {t('budgets')}
          </Link>
          <Link className="btn secondary" to="/settings/recurring">
            {t('recurring')}
          </Link>
        </div>
      </section>

      <section className="card">
        <p className="label">{t('data')}</p>
        <div className="actions">
          <button
            type="button"
            className="btn secondary"
            disabled={!hasTransactions || busy}
            onClick={handleExportAll}
          >
            {t('exportAll')}
          </button>
          {!hasTransactions && (
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => run(loadSampleData)}
            >
              {t('loadSample')}
            </button>
          )}
          {(hasTransactions || hasCustomCategories) && (
            <button
              type="button"
              className="btn danger"
              disabled={busy}
              onClick={handleClear}
            >
              {t('clearAll')}
            </button>
          )}
        </div>
      </section>
    </>
  )
}
