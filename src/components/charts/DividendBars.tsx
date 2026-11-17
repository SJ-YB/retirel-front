import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type {
  ValueType,
  NameType,
} from 'recharts/types/component/DefaultTooltipContent'

import { fmt } from '../../utils/format'
import { DIVIDEND_SERIES, totalOf } from './dividendSeries'
import type { DividendBarPoint } from './dividendSeries'

const TICK_STYLE = {
  fill: '#4E5870',
  fontFamily: 'JetBrains Mono',
  fontSize: 10,
}

// 'YYYY-MM' → 'YY.MM', 'YYYY' → 'YYYY'
const periodLabel = (period: string): string =>
  period.length === 7 ? period.slice(2).replace('-', '.') : period

function DividendTooltip({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as DividendBarPoint | undefined
  if (!point) return null
  return (
    <div
      style={{
        background: 'rgba(11,18,32,0.95)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      <div className="label-caps" style={{ marginBottom: 4 }}>
        {point.period.replace('-', '.')}
      </div>
      {[...DIVIDEND_SERIES].reverse().map((s) => (
        <div
          key={s.key}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}
        >
          <span style={{ color: s.color }}>{s.label}</span>
          <span className="mono">
            {fmt.won(point[s.key])}
            {s.key === 'overseas' && point.overseasUsd > 0 && (
              <span className="muted"> ({fmt.usd2(point.overseasUsd)})</span>
            )}
          </span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 4,
          paddingTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span>합계</span>
        <span className="mono">{fmt.won(totalOf(point))}</span>
      </div>
      {point.estimated > 0 && (
        <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
          추정분 {fmt.won(point.estimated)} 포함
        </div>
      )}
    </div>
  )
}

/** 기간별 세후 배당을 국내·해외로 쌓아 그린 막대 차트. */
function DividendBars({
  points,
  height = 200,
}: {
  points: DividendBarPoint[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={points}
        margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="period"
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
          tickFormatter={periodLabel}
        />

        <YAxis
          tickFormatter={(v: number) => fmt.krwShort(v)}
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          width={64}
        />

        <Tooltip
          content={DividendTooltip}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />

        {DIVIDEND_SERIES.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="dividend"
            fill={s.color}
            radius={i === DIVIDEND_SERIES.length - 1 ? [2, 2, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default DividendBars
