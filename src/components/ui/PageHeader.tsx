import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  meta?: string
  right?: ReactNode
}

function PageHeader({ title, meta, right }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '22px 28px 18px',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1
          className="serif"
          style={{ fontSize: 30, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.05 }}
        >
          {title}
        </h1>
        {meta && (
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}
          >
            {meta}
          </div>
        )}
      </div>
      {right && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {right}
        </div>
      )}
    </div>
  )
}

export default PageHeader
