import { useState } from 'react'
import { useSettings } from '../context/useSettings'
import { useTransactions } from '../context/useTransactions'
import { formatDate } from '../lib/format'
import { parseDate } from '../lib/dates'
import { changeSchedule, describeSchedule } from '../lib/quincenaSchedule'
import { useToday } from '../lib/useToday'

// Days typed in the boxes: whole numbers 1-31, the second one may be empty
const toDay = (text) => (/^\d{1,2}$/.test(text) ? Number(text) : null)
const isDay = (day) => day !== null && day >= 1 && day <= 31

// Settings card: how the quincena is cut. The change takes effect when the
// quincena in progress ends; what is already registered is never moved.
export default function QuincenaSetting() {
  const { locale, t } = useSettings()
  const { quincenaSchedule, saveQuincenaSchedule } = useTransactions()
  const today = useToday()
  const { current, pending } = describeSchedule(quincenaSchedule, today)
  const shown = pending ?? current

  const [mode, setMode] = useState(shown.mode)
  const [day1, setDay1] = useState(String(shown.mode === 'paydays' ? shown.day1 : 5))
  const [day2, setDay2] = useState(
    shown.mode === 'paydays' ? String(shown.day2 ?? '') : '20',
  )
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const first = toDay(day1)
  const second = day2 === '' ? null : toDay(day2)
  const daysValid =
    isDay(first) && (day2 === '' || isDay(second)) && second !== first
  const choice =
    mode === 'fixed'
      ? { mode: 'fixed' }
      : { mode: 'paydays', day1: first, day2: second }
  const next = mode === 'fixed' || daysValid
    ? changeSchedule(quincenaSchedule, choice, today)
    : quincenaSchedule
  const changed = JSON.stringify(next) !== JSON.stringify(quincenaSchedule)
  const canSave = !busy && (mode === 'fixed' || daysValid) && changed

  const describe = (entry) =>
    entry.mode === 'fixed'
      ? t('quincenaMode15')
      : `${t('quincenaPayDays')}: ${[entry.day1, entry.day2].filter(Boolean).join(' · ')}`

  const handleSave = async () => {
    if (!canSave) return
    setBusy(true)
    setFailed(false)
    try {
      await saveQuincenaSchedule(next)
    } catch (error) {
      console.error(error)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, '').slice(0, 2))

  return (
    <section className="card">
      <p className="label">{t('quincenaSetting')}</p>
      <p className="sub">{describe(current)}</p>
      {pending && (
        <p className="sub">
          {t('quincenaPending')} {formatDate(parseDate(pending.from), locale)}:{' '}
          {describe(pending)}
        </p>
      )}

      <div className="pill-group wrap">
        <button
          type="button"
          className={mode === 'fixed' ? 'pill active' : 'pill'}
          aria-pressed={mode === 'fixed'}
          onClick={() => setMode('fixed')}
        >
          {t('quincenaMode15')}
        </button>
        <button
          type="button"
          className={mode === 'paydays' ? 'pill active' : 'pill'}
          aria-pressed={mode === 'paydays'}
          onClick={() => setMode('paydays')}
        >
          {t('quincenaModePaydays')}
        </button>
      </div>

      {mode === 'paydays' && (
        <>
          <label className="field">
            <span className="label">{t('quincenaDay1')}</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={day1}
              onChange={digits(setDay1)}
            />
          </label>
          <label className="field">
            <span className="label">{t('quincenaDay2')}</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={day2}
              onChange={digits(setDay2)}
            />
          </label>
          {!daysValid && (
            <p className="field-note error" role="alert">
              {t('quincenaDaysInvalid')}
            </p>
          )}
          <p className="field-note">{t('quincenaMonthEnd')}</p>
        </>
      )}

      <p className="field-note">{t('quincenaForward')}</p>
      {failed && (
        <p className="field-note error" role="alert">
          {t('saveError')}
        </p>
      )}
      <div className="actions">
        <button type="button" className="btn" disabled={!canSave} onClick={handleSave}>
          {t('save')}
        </button>
      </div>
    </section>
  )
}
