import type { ReactNode } from 'react'

interface KpiCardProps {
  color: string
  label: string
  value: string
  footer?: ReactNode
}

function KpiCard({ color, label, value, footer }: KpiCardProps) {
  return (
    <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <div
          className="label-caps"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {label}
        </div>
      </div>
      <div
        className="serif num"
        style={{ fontSize: 26, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
      >
        {value}
      </div>
      {footer && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export default KpiCard
