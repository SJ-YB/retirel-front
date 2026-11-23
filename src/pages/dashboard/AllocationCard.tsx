import AllocationDonut from '../../components/charts/AllocationDonut'
import type { AllocationResponse } from '../../types/networth'
import { fmt } from '../../utils/format'
import { toSlices } from './allocation'

interface AllocationCardProps {
  allocation: AllocationResponse | null
  loading: boolean
}

/**
 * 증권 자산의 자산군별 비중(주식·채권·금·현금성·기타).
 *
 * 분모는 증권 평가액(보유 종목 원화 환산 합)이다. 자산군은 관찰 종목 화면에서
 * 종목마다 지정하며, 지정하지 않은 종목은 주식으로 잡힌다.
 */
function AllocationCard({ allocation, loading }: AllocationCardProps) {
  const slices = allocation ? toSlices(allocation) : []
  const total = allocation ? Number(allocation.total_krw) : 0

  return (
    <div className="card" style={{ padding: 20 }} aria-label="자산군별 비중">
      <div style={{ marginBottom: 14 }}>
        <div className="serif" style={{ fontSize: 18 }}>
          자산군별 비중
        </div>
        <div className="label-caps" style={{ marginTop: 4 }}>
          ASSET ALLOCATION · BY CLASS
          {allocation?.as_of ? ` · ${fmt.dateYmd(allocation.as_of)}` : ''}
        </div>
      </div>

      {slices.length === 0 ? (
        <div
          style={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          {loading
            ? '불러오는 중…'
            : '평가된 보유 종목이 없습니다. 새로고침으로 시세를 수집하세요.'}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <AllocationDonut
            data={slices}
            size={160}
            total={fmt.krwShort(total)}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              flex: 1,
              minWidth: 140,
            }}
          >
            {slices.map((s) => (
              <div
                key={s.key}
                data-testid={`allocation-${s.key}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.color,
                  }}
                />
                <div style={{ flex: 1, fontSize: 13 }}>{s.label}</div>
                <div className="mono" style={{ fontSize: 13 }}>
                  {s.pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allocation && allocation.unpriced_tickers.length > 0 && (
        <div
          style={{ marginTop: 14, fontSize: 11, color: 'var(--text-3)' }}
          role="note"
        >
          시세·환율이 없어 비중에서 빠진 종목:{' '}
          <span className="mono">{allocation.unpriced_tickers.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

export default AllocationCard
