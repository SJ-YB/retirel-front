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

import type { PriceCurrency } from '../../types/price'
import { fmt } from '../../utils/format'

export interface PricePoint {
  date: string
  close: number
}

interface PriceChartProps {
  points: PricePoint[]
  currency: PriceCurrency
  height?: number
}

const TICK_STYLE = {
  fill: '#4E5870',
  fontFamily: 'JetBrains Mono',
  fontSize: 10,
}

function makeTooltip(currency: PriceCurrency, accent: string) {
  return function PriceTooltip({
    active,
    payload,
  }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload || payload.length === 0) return null
    const point = payload[0]?.payload as PricePoint | undefined
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
        <div className="label-caps" style={{ marginBottom: 2 }}>
          {fmt.dateYmd(point.date)}
        </div>
        <div className="mono" style={{ color: accent }}>
          {fmt.money(point.close, currency)}
        </div>
      </div>
    )
  }
}

/**
 * 일별 종가 시계열 차트.
 *
 * 구간 안에서의 움직임을 보는 것이 목적이라 Y축은 0이 아니라 데이터 범위에
 * 맞춘다(0을 깔면 대부분의 일간 변동이 평평한 선으로 뭉개진다).
 */
function PriceChart({ points, currency, height = 300 }: PriceChartProps) {
  // 마지막 값이 첫 값보다 높으면 상승색, 아니면 하락색으로 구간 성격을 드러낸다.
  const isUp =
    points.length > 1 && points[points.length - 1].close >= points[0].close
  const accent = isUp ? '#6EE7A8' : '#F38BA8'
  const gradientId = 'priceAreaFill'
  const TooltipContent = makeTooltip(currency, accent)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={points}
        margin={{ top: 16, right: 12, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
            <stop offset="70%" stopColor={accent} stopOpacity={0.06} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>

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
          tickFormatter={(v: number) => fmt.moneyShort(v, currency)}
          domain={['dataMin', 'dataMax']}
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          width={64}
        />

        <Tooltip
          content={TooltipContent}
          cursor={{
            stroke: 'rgba(255,255,255,0.2)',
            strokeWidth: 1,
            strokeDasharray: '2 3',
          }}
        />

        <Area
          type="monotone"
          dataKey="close"
          stroke={accent}
          strokeWidth={1.8}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: accent, stroke: '#0B1220', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default PriceChart
