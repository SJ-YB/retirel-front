import { useEffect, useMemo, useState } from 'react'

import { apiClient } from '../../api'
import PrincipalChart from '../../components/charts/PrincipalChart'
import { PRINCIPAL_SERIES } from '../../components/charts/principalSeries'
import type { PrincipalChartPoint } from '../../components/charts/principalSeries'
import type { PrincipalPointResponse } from '../../types/networth'
import { fmt } from '../../utils/format'

interface PrincipalSectionProps {
  // 조회 시작일(YYYY-MM-DD). null이면 전체 기간.
  start: string | null
  // 헤더에 표시할 구간 이름(예: '6M').
  rangeLabel: string
  isMobile: boolean
}

function toChartPoint(point: PrincipalPointResponse): PrincipalChartPoint {
  return {
    date: point.date,
    stock: Number(point.stock),
    savings: Number(point.savings),
    housing: Number(point.housing_subscription),
  }
}

const totalOf = (p: PrincipalChartPoint) => p.stock + p.savings + p.housing

function signedShort(n: number): string {
  return `${n >= 0 ? '+' : '-'}${fmt.krwShort(Math.abs(n))}`
}

/**
 * 금융자산 원금 추이(주식 매수금액 · 예적금 납입원금 · 주택청약 납입금).
 *
 * 평가액이 아니라 넣은 돈의 누계라 시세 갱신과 무관하다. 백엔드가 거래내역으로
 * 조회 때마다 계산하므로 별도 새로고침 없이 구간이 바뀔 때만 다시 읽는다.
 */
function PrincipalSection({
  start,
  rangeLabel,
  isMobile,
}: PrincipalSectionProps) {
  const [points, setPoints] = useState<PrincipalChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setFailed(false)
      try {
        const { data } = await apiClient.get<PrincipalPointResponse[]>(
          '/v1/net-worth/principal-trend',
          { params: start ? { start } : {} },
        )
        if (!cancelled)
          setPoints(Array.isArray(data) ? data.map(toChartPoint) : [])
      } catch {
        if (!cancelled) {
          setPoints([])
          setFailed(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [start])

  const first = points.length > 0 ? points[0] : null
  const latest = points.length > 0 ? points[points.length - 1] : null

  // 구분별 현재 원금과 구간 변동(마지막 점 − 첫 점).
  const breakdown = useMemo(
    () =>
      PRINCIPAL_SERIES.map((s) => ({
        ...s,
        value: latest ? latest[s.key] : 0,
        change:
          latest && first && points.length > 1
            ? latest[s.key] - first[s.key]
            : null,
      })),
    [first, latest, points.length],
  )
  const total = latest ? totalOf(latest) : null
  const totalChange =
    latest && first && points.length > 1
      ? totalOf(latest) - totalOf(first)
      : null

  const chartHeight = isMobile ? 200 : 260

  return (
    <div
      className="card"
      style={{ padding: 20 }}
      aria-label="금융자산 원금 추이"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <div className="serif" style={{ fontSize: 18 }}>
            금융자산 원금 추이
          </div>
          <div className="label-caps" style={{ marginTop: 4 }}>
            PRINCIPAL · {rangeLabel} TREND · KRW
          </div>
        </div>
        {total != null && (
          <div style={{ textAlign: 'right' }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>
              원금 합계
            </div>
            <div className="serif num" style={{ fontSize: 26 }}>
              {fmt.won(total)}
            </div>
            {totalChange != null && (
              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--text-2)' }}
              >
                구간 변동{' '}
                <span className={totalChange >= 0 ? 'pos' : 'neg'}>
                  {signedShort(totalChange)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {latest && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 8 : 12,
            marginBottom: 14,
          }}
        >
          {breakdown.map((b) => (
            <div
              key={b.key}
              data-testid={`principal-${b.key}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'center' : 'flex-start',
                flexDirection: isMobile ? 'row' : 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: b.color,
                  }}
                />
                {b.label}
              </div>
              <div style={{ textAlign: isMobile ? 'right' : 'left' }}>
                <div className="mono" style={{ fontSize: 15 }}>
                  {fmt.won(b.value)}
                </div>
                {b.change != null && b.change !== 0 && (
                  <div
                    className={'mono ' + (b.change >= 0 ? 'pos' : 'neg')}
                    style={{ fontSize: 11 }}
                  >
                    {signedShort(b.change)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {points.length > 0 ? (
        <PrincipalChart points={points} height={chartHeight} />
      ) : (
        <div
          style={{
            height: chartHeight,
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
            : failed
              ? '원금 추이를 불러오지 못했습니다.'
              : '아직 원금 기록이 없습니다. 증권 계좌를 연동하거나 예적금·주택청약 계좌에 납입액을 입력하세요.'}
        </div>
      )}

      <div
        className="muted"
        style={{ marginTop: 10, fontSize: 11, lineHeight: 1.5 }}
      >
        주식은 보유분의 매수원가(이동평균, 달러는 매수일 환율로 환산),
        예적금·주택청약은 입금 − 출금 누계입니다.
      </div>
    </div>
  )
}

export default PrincipalSection
