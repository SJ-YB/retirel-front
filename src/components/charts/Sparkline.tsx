import { LineChart, Line } from 'recharts'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

function Sparkline({ data, width = 64, height = 22, color }: SparklineProps) {
  if (data.length < 2) return null

  const isUp = data[data.length - 1] >= data[0]
  const stroke = color ?? (isUp ? 'var(--pos)' : 'var(--neg)')

  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <LineChart
      width={width}
      height={height}
      data={chartData}
      margin={{ top: 1, right: 1, bottom: 1, left: 1 }}
    >
      <Line
        type="monotone"
        dataKey="v"
        stroke={stroke}
        strokeWidth={1.3}
        dot={false}
        strokeLinecap="round"
        strokeLinejoin="round"
        isAnimationActive={false}
      />
    </LineChart>
  )
}

export default Sparkline
