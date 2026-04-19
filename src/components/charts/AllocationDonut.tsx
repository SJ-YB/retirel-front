import { useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import type { AllocationSlice } from '../../types/dashboard'

interface AllocationDonutProps {
  data: AllocationSlice[]
  size?: number
  total?: string
}

function AllocationDonut({ data, size = 180, total = '₩1.85B' }: AllocationDonutProps) {
  const [hover, setHover] = useState<number | null>(null)

  const innerRadius = size / 2 - 25
  const outerRadius = size / 2 - 14

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          dataKey="pct"
          cx={size / 2 - 1}
          cy={size / 2 - 1}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          stroke="none"
          onMouseEnter={(_: unknown, index: number) => setHover(index)}
          onMouseLeave={() => setHover(null)}
        >
          {data.map((slice, i) => (
            <Cell
              key={i}
              fill={slice.color}
              style={{ cursor: 'pointer' }}
              opacity={hover === null || hover === i ? 1 : 0.6}
            />
          ))}
        </Pie>
      </PieChart>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div className="serif" style={{ fontSize: 22, color: 'var(--text)' }}>
          {hover != null ? data[hover].pct.toFixed(1) + '%' : total}
        </div>
        <div className="label-caps" style={{ marginTop: 2 }}>
          {hover != null ? data[hover].label : 'TOTAL'}
        </div>
      </div>
    </div>
  )
}

export default AllocationDonut
