import Header from '../Header'
import Logo from './Logo'

// A whole screen for loading, blocked and error: bar, logo, a line of text
// and an optional button. `busy` marks the text as a loading message.
export default function StatusScreen({ text, actionLabel, onAction, busy = false }) {
  return (
    <>
      <Header />
      <main>
        <section className="card empty-state status-screen">
          <Logo className={busy ? 'empty-logo loading-logo' : 'empty-logo'} />
          <p className="sub" role={busy ? 'status' : 'alert'}>
            {text}
          </p>
          {actionLabel && (
            <button type="button" className="btn" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </section>
      </main>
    </>
  )
}
