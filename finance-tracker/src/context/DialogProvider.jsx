import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DialogContext } from './DialogContext'
import { useSettings } from './useSettings'

// Replaces window.confirm / window.alert with a dialog of the app. It uses
// the native <dialog> element opened with showModal(), so the browser traps
// the focus inside it, closes it with Esc and gives the focus back to the
// button that opened it. The safe button (Cancel, or OK in an alert) gets
// the focus first.
//
//   const { confirm, alert } = useDialog()
//   const { confirmed, checked } = await confirm({
//     message,                    text (line breaks are kept)
//     confirmLabel, cancelLabel,  button texts (default Confirm / Cancel)
//     danger: true,               red confirm button, for deleting
//     checkbox: { label, defaultChecked },  an extra option, optional
//   })
//   await alert(message)
export default function DialogProvider({ children }) {
  const { t } = useSettings()
  const [dialog, setDialog] = useState(null)
  const [checked, setChecked] = useState(false)
  const ref = useRef(null)
  const current = useRef(null)

  const open = useCallback((options) => {
    // a dialog opened while another one is showing answers the first "no"
    current.current?.resolve({ confirmed: false, checked: false })
    return new Promise((resolve) => {
      const next = { ...options, resolve }
      current.current = next
      setChecked(Boolean(options.checkbox?.defaultChecked))
      setDialog(next)
    })
  }, [])

  const confirm = useCallback((options) => open({ kind: 'confirm', ...options }), [open])
  const alert = useCallback(
    (message) => open({ kind: 'alert', message }).then(() => undefined),
    [open],
  )

  useEffect(() => {
    const element = ref.current
    if (dialog && element) {
      if (!element.open) element.showModal()
      // the safe button first, even when the dialog has a checkbox; also when
      // a second dialog replaces the one that was showing
      element.querySelector('[data-autofocus]')?.focus()
    }
  }, [dialog])

  const close = (confirmed) => {
    if (!dialog) return
    ref.current?.close()
    current.current = null
    setDialog(null)
    dialog.resolve({ confirmed, checked })
  }

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert])
  const isAlert = dialog?.kind === 'alert'

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <dialog
          ref={ref}
          className="modal"
          aria-labelledby="dialog-message"
          onCancel={(event) => {
            // Esc: the same as pressing Cancel
            event.preventDefault()
            close(false)
          }}
        >
          <p className="modal-message" id="dialog-message">
            {dialog.message}
          </p>
          {dialog.checkbox && (
            <label className="modal-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
              />
              <span>{dialog.checkbox.label}</span>
            </label>
          )}
          <div className="modal-actions">
            {!isAlert && (
              <button
                type="button"
                className="btn secondary"
                data-autofocus
                onClick={() => close(false)}
              >
                {dialog.cancelLabel ?? t('cancel')}
              </button>
            )}
            <button
              type="button"
              className={dialog.danger && !isAlert ? 'btn danger' : 'btn'}
              data-autofocus={isAlert ? '' : undefined}
              onClick={() => close(true)}
            >
              {isAlert ? t('ok') : (dialog.confirmLabel ?? t('confirm'))}
            </button>
          </div>
        </dialog>
      )}
    </DialogContext.Provider>
  )
}
