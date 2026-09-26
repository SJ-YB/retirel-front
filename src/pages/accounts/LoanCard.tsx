import type { LoanResponse } from '../../types/loan'
import { fmt } from '../../utils/format'

const DAY_MS = 24 * 60 * 60 * 1000

// 만기까지 남은 일수. 오늘이 만기면 0, 지났으면 음수.
function daysToMaturity(iso: string, today: Date = new Date()): number {
  const maturity = new Date(iso + 'T00:00:00')
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((maturity.getTime() - base.getTime()) / DAY_MS)
}

function maturityLabel(days: number): string {
  if (days < 0) return `만기 ${-days}일 지남`
  if (days === 0) return '오늘 만기'
  return `D-${days}`
}

/** 계좌 목록에 일반 계좌 카드와 나란히 놓이는 대출 카드. 누르면 수정 모달이 열린다. */
function LoanCard({
  loan,
  onClick,
}: {
  loan: LoanResponse
  onClick: () => void
}) {
  const principal = Number(loan.principal)
  const balance = Number(loan.balance)
  const repaidPct =
    principal > 0
      ? Math.max(0, Math.min(100, (1 - balance / principal) * 100))
      : 0
  const days = daysToMaturity(loan.maturity_date)
  const overdue = days < 0

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      aria-label={`${loan.alias} 수정`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{
        position: 'relative',
        padding: 18,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div className="stripe" style={{ background: 'var(--rose)' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            {loan.account} · 대출
          </div>
          <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
            {loan.alias}
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 4,
            background: 'rgba(243,139,168,0.14)',
            color: 'var(--rose)',
            flexShrink: 0,
          }}
        >
          연 {loan.interest_rate}%
        </div>
      </div>

      <div
        className="serif num"
        style={{
          fontSize: 22,
          margin: '14px 0 4px',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        -{fmt.won(balance)}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        원금 {fmt.won(principal)} · 상환 {repaidPct.toFixed(0)}%
      </div>

      <div className="hr" style={{ margin: '16px 0 12px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            만기일
          </div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
            {fmt.dateYmd(loan.maturity_date)}
          </div>
        </div>
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            남은 기간
          </div>
          <div
            className="mono"
            style={{
              fontSize: 13,
              color: overdue ? 'var(--rose)' : 'var(--text-2)',
            }}
          >
            {maturityLabel(days)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoanCard
