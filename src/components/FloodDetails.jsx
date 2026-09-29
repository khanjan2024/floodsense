import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SAFETY_TIPS } from '../utils/riskScore.js'

function formatDay(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatValue(value, unit = '') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  const number = Number(value)
  return `${Number.isInteger(number) ? number : number.toFixed(1)}${unit}`
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="flood-chart-tooltip">
      <strong>{formatDay(label)}</strong>
      {payload.map((item) => (
        <p key={item.dataKey}>
          <span style={{ color: item.color }}>{item.name}</span>
          <span>{formatValue(item.value, item.dataKey === 'precipitation' ? ' mm' : ' m³/s')}</span>
        </p>
      ))}
    </div>
  )
}

export default function FloodDetails({ locationName, dailyData, riskResult }) {
  const days = Array.isArray(dailyData) ? dailyData.slice(0, 7) : []
  const level = riskResult.level.toLowerCase()

  return (
    <div className="flood-details">
      <header className="flood-details-header">
        <div>
          <p className="results-eyebrow">Flood outlook</p>
          <h2>{locationName}</h2>
        </div>
        <div className={`flood-risk-badge risk-${level}`}>
          <span>{riskResult.level}</span>
          <strong>{riskResult.score}</strong>
          <small>/100</small>
        </div>
      </header>

      <section className="flood-reasons" aria-label="Risk reasons">
        <h3>Risk assessment</h3>
        <ul>
          {riskResult.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </section>

      <section className="flood-chart-section" aria-labelledby="flood-chart-title">
        <div className="flood-section-heading">
          <h3 id="flood-chart-title">Rainfall and river flow</h3>
          <div className="flood-chart-legend" aria-hidden="true">
            <span><i className="legend-rain" />Rain</span>
            <span><i className="legend-river" />River</span>
          </div>
        </div>
        {days.length ? (
          <div className="flood-chart" role="img" aria-label="Seven-day rainfall and river discharge chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 4" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  tick={{ fill: 'var(--color-muted-text)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="rain"
                  tick={{ fill: 'var(--color-muted-text)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <YAxis
                  yAxisId="river"
                  orientation="right"
                  tick={{ fill: 'var(--color-muted-text)', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip content={<ForecastTooltip />} cursor={{ fill: 'var(--color-surface-subtle)' }} />
                <Bar
                  yAxisId="rain"
                  dataKey="precipitation"
                  name="Rainfall"
                  fill="var(--color-accent)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
                <Line
                  yAxisId="river"
                  dataKey="discharge"
                  name="River flow"
                  stroke="var(--color-highlight)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: 'var(--color-highlight)', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="flood-chart-empty">No seven-day chart data is available.</p>
        )}
        <div className="flood-chart-units"><span>Rainfall (mm)</span><span>River discharge (m³/s)</span></div>
      </section>

      <section className="flood-days-section" aria-labelledby="flood-days-title">
        <div className="flood-section-heading">
          <h3 id="flood-days-title">Next 7 days</h3>
          <span>Daily forecast</span>
        </div>
        <div className="flood-day-cards">
          {days.map((day) => (
            <article className="flood-day-card" key={day.date}>
              <h4>{formatDay(day.date)}</h4>
              <p className="flood-day-rain">{formatValue(day.precipitation, ' mm')}</p>
              <span>Rain</span>
              <p className="flood-day-probability">{formatValue(day.precipProbability, '%')}</p>
              <span>Chance</span>
            </article>
          ))}
        </div>
      </section>

      <section className={`flood-safety-card risk-${level}`} aria-labelledby="flood-safety-title">
        <h3 id="flood-safety-title">Safety tips</h3>
        <ul>
          {(SAFETY_TIPS[riskResult.level] ?? SAFETY_TIPS.Low).map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
      </section>

      <p className="flood-data-note">
        Data from Open-Meteo. Estimates only, follow official alerts from ASDMA/local authorities.
      </p>
    </div>
  )
}