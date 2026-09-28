import type { RentalDepositResponse } from '../../types/rentalDeposit'
import { fmt } from '../../utils/format'
import { daysToMaturity, maturityLabel } from '../../utils/maturity'

/** 자산 화면 임대 보증금 탭의 보증금 카드. 누르면 수정 모달이 열린다. */
function RentalDepositCard({
  deposit,
  onClick,
}: {
  deposit: RentalDepositResponse
  onClick: () => void
}) {
  const amount = Number(deposit.amount)
  const days = daysToMaturity(deposit.maturity_date)
  const overdue = days < 0

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      aria-label={`${deposit.alias} 수정`}
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
      <div className="stripe" style={{ background: 'var(--sky)' }} />
      <div className="label-caps" style={{ marginBottom: 6 }}>
        임대 보증금
      </div>
      <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
        {deposit.alias}
      </div>

      <div
        className="serif num pos"
        style={{
          fontSize: 22,
          margin: '14px 0 4px',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        +{fmt.won(amount)}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        보증금
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
            {fmt.dateYmd(deposit.maturity_date)}
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

export default RentalDepositCard
