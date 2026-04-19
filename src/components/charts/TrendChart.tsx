import type { NetWorthTrendPoint } from '../../types/dashboard'
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
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

interface TrendChartProps {
  series: NetWorthTrendPoint[]
  height?: number
  accent?: string
}

const TICK_STYLE = { fill: '#4E5870', fontFamily: 'JetBrains Mono', fontSize: 10 }

function makeTooltip(accent: string) {
  return function TrendTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload || payload.length === 0) return null
    const point = payload[0]?.payload as NetWorthTrendPoint | undefined
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
          {point.label}
        </div>
        <div className="mono" style={{ color: accent }}>
          ₩ {point.netWorth.toFixed(2)}B
        </div>
        <div className="mono muted" style={{ fontSize: 11 }}>
          deposits ₩ {point.deposits.toFixed(2)}B
        </div>
      </div>
    )
  }
}

function TrendChart({ series, height = 260, accent = '#F5C26B' }: TrendChartProps) {
  const gradientId = 'trendAreaFill'
  const TooltipContent = makeTooltip(accent)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
            <stop offset="60%" stopColor={accent} stopOpacity={0.1} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(value: string) => value.split(' ')[0]}
        />

        <YAxis
          tickFormatter={(v: number) => v.toFixed(2) + 'B'}
          domain={['dataMin * 0.96', 'dataMax * 1.05']}
          axisLine={false}
          tickLine={false}
          tick={TICK_STYLE}
          width={40}
        />

        <Tooltip
          content={TooltipContent}
          cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '2 3' }}
        />

        <Area
          type="monotone"
          dataKey="deposits"
          stroke="var(--sky)"
          strokeDasharray="2 4"
          strokeWidth={1.5}
          fill="none"
          dot={false}
          activeDot={false}
          opacity={0.7}
        />

        <Area
          type="monotone"
          dataKey="netWorth"
          stroke={accent}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, fill: accent, stroke: '#0B1220', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default TrendChart
