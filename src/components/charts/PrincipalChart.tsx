import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { PRINCIPAL_SERIES } from './principalSeries'
import type { PrincipalChartPoint } from './principalSeries'

const TICK_STYLE = {
  fill: '#4E5870',
  fontFamily: 'JetBrains Mono',
  fontSize: 10,
}

function PrincipalTooltip({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as PrincipalChartPoint | undefined
  if (!point) return null
  const total = point.stock + point.savings + point.housing
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
        {fmt.dateYmd(point.date)}
      </div>
      {[...PRINCIPAL_SERIES].reverse().map((s) => (
        <div
          key={s.key}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}
        >
          <span style={{ color: s.color }}>{s.label}</span>
          <span className="mono">{fmt.won(point[s.key])}</span>
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
        <span className="mono">{fmt.won(total)}</span>
      </div>
    </div>
  )
}

/**
 * 구분별 금융자산 원금을 쌓아 그린 누적 영역 차트.
 *
 * 순자산 차트와 달리 Y축을 0부터 깐다 — 원금은 '얼마나 쌓였나'를 보는 값이라
 * 비율이 보존돼야 구분 간 크기를 비교할 수 있다.
 */
function PrincipalChart({
  points,
  height = 260,
}: {
  points: PrincipalChartPoint[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={points}
        margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="date"
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
          tickFormatter={(value: string) => value.slice(2).replace(/-/g, '.')}
        />

        <YAxis
          tickFormatter={(v: number) => fmt.krwShort(v)}
          domain={[0, 'auto']}
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          width={64}
        />

        <Tooltip
          content={PrincipalTooltip}
          cursor={{
            stroke: 'rgba(255,255,255,0.2)',
            strokeWidth: 1,
            strokeDasharray: '2 3',
          }}
        />

        {PRINCIPAL_SERIES.map((s) => (
          <Area
            key={s.key}
            type="stepAfter"
            dataKey={s.key}
            name={s.label}
            stackId="principal"
            stroke={s.color}
            strokeWidth={1.5}
            fill={s.color}
            fillOpacity={0.18}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default PrincipalChart
