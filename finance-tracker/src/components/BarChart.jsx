export default function BarChart({ bars, formatValue }) {
  const max = Math.max(...bars.map((b) => b.total), 1)

  return (
    <div className="bar-chart">
      {bars.map((bar) => (
        <div className="bar-col" key={bar.label}>
          <div className="bar-track">
            <div
              className={
                bar.total === max ? 'bar-fill max' : 'bar-fill'
              }
              style={{ height: `${(bar.total / max) * 100}%` }}
              title={formatValue(bar.total)}
            />
          </div>
          <span className="bar-label">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}