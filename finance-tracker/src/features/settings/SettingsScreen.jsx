import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '../../context/useTransactions'
import { useSettings } from '../../context/useSettings'
import { buildBackup, parseBackup } from '../../lib/backup'
import { downloadCsv, downloadFile, transactionRows } from '../../lib/csv'
import { byNewest, isValidDate, parseDate, todayString } from '../../lib/dates'
import { readPref, writePref } from '../../lib/prefs'

// The date of the last backup made on this device, or null
function readLastBackup() {
  const saved = readPref('lastBackup')
  return saved && isValidDate(saved) ? saved : null
}

export default function SettingsScreen() {
  const { lang, setLang, theme, setTheme, locale, t } = useSettings()
  const {
    transactions,
    categories,
    budgets,
    recurring,
    loadSampleData,
    clearAllData,
    restoreData,
  } = useTransactions()

  const [busy, setBusy] = useState(false)
  const [lastBackup, setLastBackup] = useState(readLastBackup)

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

  const handleDownloadBackup = () => {
    const backup = buildBackup({ transactions, categories, budgets, recurring })
    const today = todayString()
    downloadFile(
      `quincena-backup-${today}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    writePref('lastBackup', today)
    setLastBackup(today)
  }

  const handleRestoreFile = async (event) => {
    const input = event.target
    const file = input.files[0]
    if (!file) return
    let text
    try {
      text = await file.text()
    } catch (error) {
      console.error(error)
      window.alert(t('invalidBackup'))
      return
    } finally {
      // so the same file can be picked again
      input.value = ''
    }
    const data = parseBackup(
      text,
      categories.filter((c) => c.key),
    )
    if (!data) {
      window.alert(t('invalidBackup'))
      return
    }
    if (window.confirm(t('confirmRestore'))) run(() => restoreData(data))
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
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={handleDownloadBackup}
          >
            {t('downloadBackup')}
          </button>
          <label className={busy ? 'btn secondary disabled' : 'btn secondary'}>
            {t('restoreBackup')}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={handleRestoreFile}
            />
          </label>
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
        <p className="sub backup-note">
          {lastBackup
            ? `${t('lastBackup')} ${parseDate(lastBackup).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}`
            : t('noBackupYet')}
        </p>
      </section>
    </>
  )
}
