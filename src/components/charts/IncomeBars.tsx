import type { IncomeHistoryPoint } from '../../types/dashboard'
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
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

interface IncomeBarsProps {
  data: IncomeHistoryPoint[]
  height?: number
}

const TICK_STYLE = { fill: '#4E5870', fontFamily: 'JetBrains Mono', fontSize: 10 }

function IncomeTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as IncomeHistoryPoint | undefined
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
      <div className="label-caps" style={{ marginBottom: 3 }}>
        {point.month} &apos;26
      </div>
      <div className="mono" style={{ color: 'var(--accent)' }}>
        배당 ₩ {(point.dividend * 1000).toLocaleString()}
      </div>
      <div className="mono" style={{ color: 'var(--sky)' }}>
        이자 ₩ {(point.interest * 1000).toLocaleString()}
      </div>
    </div>
  )
}

function IncomeBars({ data, height = 200 }: IncomeBarsProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 16 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="month"
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
        />

        <YAxis hide />

        <Tooltip content={IncomeTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

        <Bar dataKey="interest" stackId="income" fill="var(--sky)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="dividend" stackId="income" fill="var(--accent)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default IncomeBars
