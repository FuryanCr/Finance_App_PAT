import { useSettings } from '../context/useSettings'

// First thing a keyboard or screen-reader user reaches: jumps over the bar
export default function SkipLink() {
  const { t } = useSettings()

  return (
    <a className="skip-link" href="#main">
      {t('skipToContent')}
    </a>
  )
}
