import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { MonthlyDividendResponse } from '../types/dividend'
import type { LoanResponse } from '../types/loan'
import type {
  AllocationResponse,
  NetWorthPointResponse,
  NetWorthRefreshStatusResponse,
  PrincipalPointResponse,
} from '../types/networth'
import type { RentalDepositResponse } from '../types/rentalDeposit'
import { fmt } from '../utils/format'
import { useIsMobile } from '../hooks/useIsMobile'
import PageHeader from '../components/ui/PageHeader'
import { CurrencyToggle, RangeToggle } from '../components/ui/Toggles'
import type { RangeValue } from '../components/ui/Toggles'
import KpiCard from '../components/ui/KpiCard'
import Icon from '../components/ui/Icon'
import TrendChart from '../components/charts/TrendChart'
import type { TrendPoint } from '../components/charts/TrendChart'
import PrincipalSection from './dashboard/PrincipalSection'
import DividendSection from './dashboard/DividendSection'
import AllocationCard from './dashboard/AllocationCard'
import RebalanceSection from './dashboard/RebalanceSection'
import {
  dividendsOfYear,
  monthlyChange,
  shortYearMonth,
  summarizeDeposits,
  summarizeLoans,
  unrealizedGain,
} from './dashboard/summary'
import type { Change } from './dashboard/summary'
import type { Currency } from '../types/account'

// 순자산 추이에서 볼 구간. 백엔드는 폐구간 필터만 받으므로 여기서 시작일을 계산한다.
const RANGE_DAYS: Record<RangeValue, number | null> = {
  '1M': 30,
  '3M': 91,
  '6M': 182,
  '1Y': 365,
  전체: null,
}

// 갱신이 끝났는지 확인하는 폴링 주기와 상한. 시세·환율 수집은 종목 수만큼 증권사
// API를 반복 호출해 몇 분이 걸릴 수 있어, 무한정 기다리지는 않는다.
const POLL_INTERVAL_MS = 3000
const POLL_LIMIT = 100

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startDateOf(range: RangeValue): string | null {
  const days = RANGE_DAYS[range]
  if (days == null) return null
  const from = new Date()
  from.setDate(from.getDate() - days)
  return toIsoDate(from)
}

/** 한 점의 순자산을 표시 통화로 읽는다. */
function netWorthOf(point: NetWorthPointResponse, ccy: Currency): number {
  return Number(ccy === 'KRW' ? point.net_worth_krw : point.net_worth_usd)
}

/** 양수면 pos, 음수면 neg 색을 입힌다. 값이 없으면 색을 입히지 않는다. */
function toneOf(n: number | null | undefined): 'pos' | 'neg' | undefined {
  if (n == null || n === 0) return undefined
  return n > 0 ? 'pos' : 'neg'
}

function KpiInline({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}) {
  return (
    <div>
      <div className="label-caps" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className={'mono' + (tone ? ` ${tone}` : '')}
        style={{ fontSize: 18, letterSpacing: '-0.01em' }}
      >
        {value}
      </div>
    </div>
  )
}

/** KPI 카드 하단의 '최근 1개월 변동' 표기. */
function MonthlyDelta({ change }: { change: Change | null }) {
  if (!change || change.pct == null) {
    return <span className="muted">최근 1개월 변동 없음</span>
  }
  const up = change.amount >= 0
  return (
    <>
      <span className={up ? 'pos' : 'neg'}>
        {up ? '▲' : '▼'} {fmt.pct(change.pct)}
      </span>{' '}
      <span className="muted">최근 1개월</span>
    </>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: 'var(--text-2)',
      }}
    >
      <div
        style={{ width: 6, height: 6, borderRadius: '50%', background: color }}
      />
      <span>{label}</span>
    </div>
  )
}

function DashboardPage() {
  const isMobile = useIsMobile()
  const { showToast } = useUiStore()
  const [range, setRange] = useState<RangeValue>('6M')
  const [heroCcy, setHeroCcy] = useState<Currency>('KRW')
  const [chartCcy, setChartCcy] = useState<Currency>('KRW')

  // 순자산 추이는 실제 연동 자산에서 평가된 값(GET /v1/net-worth/trend)을 읽는다.
  const [trend, setTrend] = useState<NetWorthPointResponse[]>([])
  const [loadingTrend, setLoadingTrend] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 부채·보증금·올해 배당은 순자산 갱신과 무관하게 화면에 들어올 때 한 번 읽는다.
  // 각자 실패해도 다른 지표는 보여야 하므로 따로 받아 실패한 것만 '—'로 둔다.
  const [loans, setLoans] = useState<LoanResponse[] | null>(null)
  const [deposits, setDeposits] = useState<RentalDepositResponse[] | null>(null)
  const [dividends, setDividends] = useState<MonthlyDividendResponse[] | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    const year = new Date().getFullYear()
    const loadList = async <T,>(
      url: string,
      set: (value: T[]) => void,
      params?: Record<string, string>,
    ) => {
      try {
        const { data } = await apiClient.get<T[]>(url, params && { params })
        if (!cancelled) set(Array.isArray(data) ? data : [])
      } catch {
        // 실패하면 null로 남아 '—'로 보인다.
      }
    }
    loadList<LoanResponse>('/v1/loans', setLoans)
    loadList<RentalDepositResponse>('/v1/rental-deposits', setDeposits)
    loadList<MonthlyDividendResponse>(
      '/v1/dividends/monthly-trend',
      setDividends,
      { start: `${year}-01-01` },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const fetchTrend = useCallback(async () => {
    setLoadingTrend(true)
    try {
      const start = startDateOf(range)
      const { data } = await apiClient.get<NetWorthPointResponse[]>(
        '/v1/net-worth/trend',
        {
          params: start ? { start } : {},
        },
      )
      setTrend(Array.isArray(data) ? data : [])
    } catch {
      setTrend([])
      showToast({ message: '순자산 추이를 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoadingTrend(false)
    }
  }, [range, showToast])

  useEffect(() => {
    fetchTrend()
  }, [fetchTrend])

  // 자산군별 비중(GET /v1/net-worth/allocation). 오늘 기준 보유 수량 × 마지막 종가로
  // 백엔드가 조회 때마다 계산한다.
  const [allocation, setAllocation] = useState<AllocationResponse | null>(null)
  const [loadingAllocation, setLoadingAllocation] = useState(true)

  const fetchAllocation = useCallback(async () => {
    setLoadingAllocation(true)
    try {
      const { data } = await apiClient.get<AllocationResponse>(
        '/v1/net-worth/allocation',
      )
      setAllocation(data ?? null)
    } catch {
      setAllocation(null)
    } finally {
      setLoadingAllocation(false)
    }
  }, [])

  useEffect(() => {
    fetchAllocation()
  }, [fetchAllocation])

  const handleRefresh = async () => {
    try {
      const { data } = await apiClient.post<NetWorthRefreshStatusResponse>(
        '/v1/net-worth/refresh',
      )
      showToast({
        message: data.started
          ? '시세·환율을 수집하고 순자산을 다시 평가합니다'
          : '이미 갱신이 진행 중입니다',
        type: 'info',
      })
      // 새로 시작했든 이미 돌고 있든, 끝날 때까지 지켜본다.
      setRefreshing(true)
    } catch {
      showToast({ message: '갱신 요청에 실패했습니다', type: 'error' })
    }
  }

  // 갱신은 비동기(202)라 응답만으로는 끝났는지 알 수 없다. 끝날 때까지 상태를
  // 폴링하고, 끝나면 추이를 다시 읽는다. 화면을 떠나면 폴링도 멈춘다.
  useEffect(() => {
    if (!refreshing) return

    let cancelled = false
    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      try {
        const { data } = await apiClient.get<NetWorthRefreshStatusResponse>(
          '/v1/net-worth/refresh',
        )
        if (cancelled) return
        if (!data.running || attempts >= POLL_LIMIT) {
          setRefreshing(false)
          await Promise.all([fetchTrend(), fetchAllocation()])
        }
      } catch {
        if (!cancelled) setRefreshing(false)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [refreshing, fetchTrend, fetchAllocation])

  const latest = trend.length > 0 ? trend[trend.length - 1] : null
  const heroValue = latest
    ? Math.round(netWorthOf(latest, heroCcy)).toLocaleString('en-US')
    : '—'
  // 환율은 평가에 실제로 쓴 값(그 날의 USD/KRW)을 보여준다. 평가된 순자산이
  // 없으면 비중 계산에 쓴 마지막 환율로 대신한다.
  const usdkrw = latest
    ? Number(latest.usdkrw)
    : allocation?.usdkrw != null
      ? Number(allocation.usdkrw)
      : null

  // 평가 손익: 같은 날의 증권 평가액(순자산)과 보유 주식 매수원가를 비교한다.
  // 순자산은 증권 평가액만 담으므로 원금도 주식 매수금액만 쓴다.
  const latestDate = latest?.date ?? null
  const [stockPrincipal, setStockPrincipal] = useState<{
    date: string
    value: number
  } | null>(null)

  useEffect(() => {
    if (!latestDate) return
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await apiClient.get<PrincipalPointResponse[]>(
          '/v1/net-worth/principal-trend',
          { params: { start: latestDate, end: latestDate } },
        )
        const last = Array.isArray(data) ? data[data.length - 1] : undefined
        if (!cancelled)
          setStockPrincipal(
            last ? { date: latestDate, value: Number(last.stock) } : null,
          )
      } catch {
        if (!cancelled) setStockPrincipal(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [latestDate])

  const gain =
    latest && stockPrincipal && stockPrincipal.date === latest.date
      ? unrealizedGain(Number(latest.net_worth_krw), stockPrincipal.value)
      : null

  const krwChange = useMemo(
    () => monthlyChange(trend, (p) => Number(p.krw_assets)),
    [trend],
  )
  const usdChange = useMemo(
    () => monthlyChange(trend, (p) => Number(p.usd_assets)),
    [trend],
  )
  const debt = loans ? summarizeLoans(loans) : null
  const deposit = deposits
    ? summarizeDeposits(deposits, toIsoDate(new Date()))
    : null
  const dividendYtd = dividends
    ? dividendsOfYear(dividends, new Date().getFullYear())
    : null

  const chartPoints: TrendPoint[] = useMemo(
    () =>
      trend.map((point) => ({
        date: point.date,
        value: netWorthOf(point, chartCcy),
      })),
    [trend, chartCcy],
  )
  // 구간 변동: 마지막 점 − 첫 점(표시 통화 기준).
  const change = useMemo(() => {
    if (chartPoints.length < 2) return null
    const first = chartPoints[0].value
    const last = chartPoints[chartPoints.length - 1].value
    return {
      amount: last - first,
      pct: first !== 0 ? ((last - first) / first) * 100 : null,
    }
  }, [chartPoints])

  const refreshButton = (
    <button
      className="btn"
      style={{ padding: isMobile ? '6px 8px' : 8, borderRadius: 8 }}
      type="button"
      title="시세·환율 수집 후 순자산 재평가"
      aria-label="순자산 갱신"
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <Icon name="refresh" size={isMobile ? 12 : 14} />
    </button>
  )

  return (
    <>
      <PageHeader
        title="Dashboard"
        meta={
          latest
            ? `기준일 ${fmt.dateYmd(latest.date)} · ${latest.accounts}개 계좌`
            : 'KST'
        }
        right={
          !isMobile ? (
            <>
              <RangeToggle value={range} onChange={setRange} />
              {refreshButton}
            </>
          ) : undefined
        }
      />
      {isMobile && (
        <div
          style={{
            padding: '0 18px 12px',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
          className="no-scrollbar"
        >
          <RangeToggle value={range} onChange={setRange} />
          {refreshButton}
        </div>
      )}

      <div
        style={{
          padding: isMobile ? '0 18px 100px' : '0 28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* HERO */}
        <div
          className="card"
          style={{
            position: 'relative',
            padding: isMobile ? 20 : 28,
            overflow: 'hidden',
          }}
        >
          <div className="hero-bg" />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <div className="label-caps" style={{ marginBottom: 10 }}>
                NET WORTH · 순자산
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  className="serif num"
                  style={{
                    fontSize: isMobile ? 'clamp(28px, 10vw, 48px)' : 64,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    wordBreak: 'break-all',
                  }}
                >
                  {heroValue}
                </div>
                <div className="muted" style={{ fontSize: 18 }}>
                  {heroCcy === 'KRW' ? '원' : 'USD'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, auto)',
                  gap: isMobile ? 18 : 48,
                  marginTop: 24,
                }}
              >
                <KpiInline
                  label="평가 수익률"
                  value={gain?.pct != null ? fmt.pct(gain.pct) : '—'}
                  tone={toneOf(gain?.pct)}
                />
                <KpiInline
                  label="평가 손익"
                  value={
                    gain
                      ? `${gain.amount >= 0 ? '+' : '-'}${fmt.won(Math.abs(gain.amount))}`
                      : '—'
                  }
                  tone={toneOf(gain?.amount)}
                />
                <KpiInline
                  label={`${new Date().getFullYear()} 배당 · 세후`}
                  value={dividendYtd != null ? fmt.won(dividendYtd) : '—'}
                />
                <KpiInline
                  label="USD/KRW"
                  value={usdkrw != null ? `₩ ${usdkrw.toFixed(2)}` : '—'}
                />
              </div>
            </div>

            <div style={{ alignSelf: 'flex-start' }}>
              <CurrencyToggle value={heroCcy} onChange={setHeroCcy} />
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? 10 : 16,
          }}
        >
          <KpiCard
            color="var(--accent)"
            label="KOREAN ASSETS"
            value={latest ? fmt.krwShort(Number(latest.krw_assets)) : '—'}
            footer={latest ? <MonthlyDelta change={krwChange} /> : undefined}
          />
          <KpiCard
            color="var(--emerald)"
            label="US ASSETS"
            value={latest ? fmt.usd(Number(latest.usd_assets)) : '—'}
            footer={latest ? <MonthlyDelta change={usdChange} /> : undefined}
          />
          <KpiCard
            color="var(--rose)"
            label="DEBT · 부채"
            value={debt ? fmt.krwShort(debt.total) : '—'}
            footer={
              debt && (
                <span className="muted">
                  {debt.weightedRatePct != null
                    ? `평균 금리 ${debt.weightedRatePct.toFixed(2)}% · ${loans?.length}건`
                    : '등록된 대출 없음'}
                </span>
              )
            }
          />
          <KpiCard
            color="var(--violet)"
            label="DEPOSIT · 보증금"
            value={deposit ? fmt.krwShort(deposit.total) : '—'}
            footer={
              deposit && (
                <span className="muted">
                  {deposit.nextMaturity
                    ? `임대 · 만기 ${shortYearMonth(deposit.nextMaturity)}`
                    : '등록된 보증금 없음'}
                </span>
              )
            }
          />
        </div>

        {/* CHART + DONUT */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: 16,
          }}
        >
          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 14,
              }}
            >
              <div>
                <div className="serif" style={{ fontSize: 18 }}>
                  순자산 추이
                </div>
                <div className="label-caps" style={{ marginTop: 4 }}>
                  NET WORTH · {range} TREND
                </div>
              </div>
              <CurrencyToggle value={chartCcy} onChange={setChartCcy} />
            </div>
            {chartPoints.length > 0 ? (
              <TrendChart
                points={chartPoints}
                currency={chartCcy}
                height={isMobile ? 200 : 260}
              />
            ) : (
              <div
                style={{
                  height: isMobile ? 200 : 260,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  textAlign: 'center',
                  padding: '0 20px',
                }}
              >
                {loadingTrend
                  ? '불러오는 중…'
                  : '아직 평가된 순자산이 없습니다. 계좌를 연동하고 새로고침으로 시세·환율을 수집하세요.'}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                fontSize: 11,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <LegendDot
                  color="var(--accent)"
                  label={`순자산 (${chartCcy} 환산 · 그 날의 환율)`}
                />
              </div>
              {change && (
                <div className="mono" style={{ color: 'var(--text-2)' }}>
                  구간 변동{' '}
                  <span className={change.amount >= 0 ? 'pos' : 'neg'}>
                    {change.amount >= 0 ? '+' : '-'}
                    {fmt.moneyShort(Math.abs(change.amount), chartCcy)}
                  </span>
                  {change.pct != null && (
                    <span style={{ marginLeft: 8 }}>
                      ({fmt.pct(change.pct)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <AllocationCard allocation={allocation} loading={loadingAllocation} />
        </div>

        {/* REBALANCE GUIDE */}
        <RebalanceSection allocation={allocation} isMobile={isMobile} />

        {/* PRINCIPAL TREND */}
        <PrincipalSection
          start={startDateOf(range)}
          rangeLabel={range}
          isMobile={isMobile}
        />

        {/* DIVIDEND TREND */}
        <DividendSection isMobile={isMobile} />
      </div>
    </>
  )
}

export default DashboardPage
