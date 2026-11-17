import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { apiClient } from '../../api'
import DividendBars from '../../components/charts/DividendBars'
import { DIVIDEND_SERIES } from '../../components/charts/dividendSeries'
import type { DividendBarPoint } from '../../components/charts/dividendSeries'
import type { MonthlyDividendResponse } from '../../types/dividend'
import { fmt } from '../../utils/format'
import { summarize, toMonthlyPoint, toYearly } from './dividendTrend'

type ViewMode = '월별' | '연도별'

// 월별 보기에서 보여줄 최근 개월 수. 전체 이력은 연도별 보기로 본다.
const MONTHLY_WINDOW = 24

function Stat({
  label,
  value,
  footer,
  testId,
}: {
  label: string
  value: string
  footer?: ReactNode
  testId: string
}) {
  return (
    <div
      data-testid={testId}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
      }}
    >
      <div className="label-caps" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 15 }}>
        {value}
      </div>
      {footer && (
        <div className="mono" style={{ fontSize: 11, marginTop: 2 }}>
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * 배당금 수령 추이(세후, 원화). 국내 배당과 해외 배당(수령일 환율 환산)을 쌓아
 * 월별·연도별로 보여준다.
 *
 * 백엔드가 거래내역으로 조회 때마다 계산하고, 대시보드 구간(1M~전체)과는 따로
 * 전체 이력을 한 번 읽는다 — 배당은 분기·연 단위로 들어와 짧은 구간으로 자르면
 * 추이가 보이지 않는다.
 */
function DividendSection({ isMobile }: { isMobile: boolean }) {
  const [months, setMonths] = useState<DividendBarPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<ViewMode>('월별')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await apiClient.get<MonthlyDividendResponse[]>(
          '/v1/dividends/monthly-trend',
        )
        if (!cancelled)
          setMonths(Array.isArray(data) ? data.map(toMonthlyPoint) : [])
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(() => summarize(months), [months])
  const bars = useMemo(
    () => (mode === '월별' ? months.slice(-MONTHLY_WINDOW) : toYearly(months)),
    [months, mode],
  )
  const hasEstimated = months.some((m) => m.estimated > 0)
  const chartHeight = isMobile ? 180 : 220

  return (
    <div className="card" style={{ padding: 20 }} aria-label="배당금 수령 추이">
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
            배당금 수령 추이
          </div>
          <div className="label-caps" style={{ marginTop: 4 }}>
            DIVIDENDS ·{' '}
            {mode === '월별' ? `LAST ${MONTHLY_WINDOW} MONTHS` : 'BY YEAR'} ·
            KRW 세후
          </div>
        </div>
        <div className="seg">
          {(['월별', '연도별'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={mode === m ? 'active' : ''}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 8 : 12,
            marginBottom: 14,
          }}
        >
          <Stat
            testId="dividend-ytd"
            label="올해 누적"
            value={fmt.won(summary.ytd)}
            footer={
              summary.ytdChangePct != null && (
                <span className={summary.ytdChangePct >= 0 ? 'pos' : 'neg'}>
                  전년 동기 대비 {fmt.pct(summary.ytdChangePct)}
                </span>
              )
            }
          />
          <Stat
            testId="dividend-last12"
            label="최근 12개월"
            value={fmt.won(summary.last12)}
          />
          <Stat
            testId="dividend-monthly-avg"
            label="월평균 (최근 12개월)"
            value={fmt.won(summary.last12 / 12)}
          />
        </div>
      )}

      {bars.length > 0 ? (
        <DividendBars points={bars} height={chartHeight} />
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
              ? '배당 추이를 불러오지 못했습니다.'
              : '아직 받은 배당이 없습니다.'}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: 10,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 14 }}>
          {DIVIDEND_SERIES.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--text-2)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: s.color,
                }}
              />
              {s.label}
            </div>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
          세후 금액, 해외 배당은 수령일 환율로 환산
          {hasEstimated && ' · 해외 배당은 배당 일정 × 보유 수량 추정치'}
        </div>
      </div>
    </div>
  )
}

export default DividendSection
