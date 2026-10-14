import { useSettings } from '../context/useSettings'

// One bar per period. The whole chart is one image for screen readers, with
// every value in its label. The highest bar is also written under the chart
// (the values used to live only in a tooltip, which touch screens never show).
export default function BarChart({ bars, formatValue }) {
  const { t } = useSettings()
  const peak = Math.max(...bars.map((b) => b.total))
  // an empty chart still draws its (zero-height) bars
  const max = Math.max(peak, 1)
  const highest = peak > 0 ? bars.find((bar) => bar.total === peak) : null
  const description = bars
    .map((bar) => `${bar.label}: ${formatValue(bar.total)}`)
    .join(', ')

  return (
    <>
      <div
        className="bar-chart"
        role="img"
        aria-label={`${t('chartLabel')}. ${description}`}
      >
        {bars.map((bar) => (
          <div className="bar-col" key={bar.label} aria-hidden="true">
            <div className="bar-track">
              <div
                className={bar === highest ? 'bar-fill max' : 'bar-fill'}
                style={{ height: `${(bar.total / max) * 100}%` }}
                title={formatValue(bar.total)}
              />
            </div>
            <span className="bar-label">{bar.label}</span>
          </div>
        ))}
      </div>
      {highest && (
        <p className="sub bar-peak">
          {t('chartPeak')}: {highest.label} · {formatValue(highest.total)}
        </p>
      )}
    </>
  )
}
