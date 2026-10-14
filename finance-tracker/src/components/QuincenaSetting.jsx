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

// What the boxes say as a choice for the schedule, or null while the days are
// not valid
function toChoice(mode, day1, day2) {
  if (mode === 'fixed') return { mode: 'fixed' }
  const first = toDay(day1)
  const second = day2 === '' ? null : toDay(day2)
  const valid = isDay(first) && (day2 === '' || isDay(second)) && second !== first
  return valid ? { mode: 'paydays', day1: first, day2: second } : null
}

// How the quincena is cut. In Settings it is a card with its own Save button:
// the change takes effect when the quincena in progress ends, and what is
// already registered is never moved. With `embedded` (the welcome steps) it
// has no card or Save button and reports each choice through onChange
// (the choice, or null while the days are not valid); the welcome saves it,
// and `initial` is the choice to show when the step is opened again.
export default function QuincenaSetting({ embedded = false, initial, onChange }) {
  const { locale, t } = useSettings()
  const { quincenaSchedule, saveQuincenaSchedule } = useTransactions()
  const today = useToday()
  const { current, pending } = describeSchedule(quincenaSchedule, today)
  // embedded: start from the choice already made in the welcome, if any
  const shown = (embedded && initial) || pending || current

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

  const report = (nextMode, nextDay1, nextDay2) =>
    onChange?.(toChoice(nextMode, nextDay1, nextDay2))

  const chooseMode = (nextMode) => {
    setMode(nextMode)
    report(nextMode, day1, day2)
  }

  const digits = (setter, which) => (e) => {
    const text = e.target.value.replace(/\D/g, '').slice(0, 2)
    setter(text)
    report(mode, which === 1 ? text : day1, which === 2 ? text : day2)
  }

  const Wrapper = embedded ? 'div' : 'section'

  return (
    <Wrapper className={embedded ? 'quincena-embedded' : 'card'}>
      {!embedded && <p className="label">{t('quincenaSetting')}</p>}
      {!embedded && <p className="sub">{describe(current)}</p>}
      {!embedded && pending && (
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
          onClick={() => chooseMode('fixed')}
        >
          {t('quincenaMode15')}
        </button>
        <button
          type="button"
          className={mode === 'paydays' ? 'pill active' : 'pill'}
          aria-pressed={mode === 'paydays'}
          onClick={() => chooseMode('paydays')}
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
              onChange={digits(setDay1, 1)}
            />
          </label>
          <label className="field">
            <span className="label">{t('quincenaDay2')}</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={day2}
              onChange={digits(setDay2, 2)}
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

      {!embedded && (
        <>
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
        </>
      )}
    </Wrapper>
  )
}
