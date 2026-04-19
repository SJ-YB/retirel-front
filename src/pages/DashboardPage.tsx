import { useEffect, useState } from 'react'

import { apiClient } from '../api'
import type { ApiResponse } from '../types/api'
import type {
  AllocationSlice,
  DashboardSummary,
  IncomeHistoryPoint,
  NetWorthTrendPoint,
} from '../types/dashboard'
import { fmt } from '../utils/format'
import { useIsMobile } from '../hooks/useIsMobile'
import PageHeader from '../components/ui/PageHeader'
import { CurrencyToggle, RangeToggle } from '../components/ui/Toggles'
import type { RangeValue } from '../components/ui/Toggles'
import KpiCard from '../components/ui/KpiCard'
import Icon from '../components/ui/Icon'
import TrendChart from '../components/charts/TrendChart'
import AllocationDonut from '../components/charts/AllocationDonut'
import IncomeBars from '../components/charts/IncomeBars'
import {
  mockDashboardSummary,
  mockNetWorthTrend,
  mockAllocation,
  mockIncomeHistory,
} from '../mocks/data'
import type { Currency } from '../types/account'

function KpiInline({ label, value, pos }: { label: string; value: string; pos?: boolean }) {
  return (
    <div>
      <div className="label-caps" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className={'mono' + (pos ? ' pos' : '')}
        style={{ fontSize: 18, letterSpacing: '-0.01em' }}
      >
        {value}
      </div>
    </div>
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
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span>{label}</span>
    </div>
  )
}

function DashboardPage() {
  const isMobile = useIsMobile()
  const [range, setRange] = useState<RangeValue>('6M')
  const [heroCcy, setHeroCcy] = useState<Currency>('KRW')
  const [chartCcy, setChartCcy] = useState<Currency>('KRW')
  const [allocMode, setAllocMode] = useState<'유형' | '통화'>('유형')

  const [summary, setSummary] = useState<DashboardSummary>(mockDashboardSummary)
  const [trend, setTrend] = useState<NetWorthTrendPoint[]>(mockNetWorthTrend)
  const [allocation, setAllocation] = useState<AllocationSlice[]>(mockAllocation)
  const [income, setIncome] = useState<IncomeHistoryPoint[]>(mockIncomeHistory)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, a, i] = await Promise.all([
          apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary'),
          apiClient.get<ApiResponse<NetWorthTrendPoint[]>>('/dashboard/networth-trend'),
          apiClient.get<ApiResponse<AllocationSlice[]>>('/dashboard/allocation'),
          apiClient.get<ApiResponse<IncomeHistoryPoint[]>>('/dashboard/income-history'),
        ])
        setSummary(s.data.data)
        setTrend(t.data.data)
        setAllocation(a.data.data)
        setIncome(i.data.data)
      } catch {
        // fall back to mock defaults
      }
    }
    load()
  }, [])

  const heroValue =
    heroCcy === 'KRW'
      ? summary.netWorth.toLocaleString('en-US')
      : Math.round(summary.netWorth / summary.usdkrw).toLocaleString('en-US')

  return (
    <>
      <PageHeader
        title="Dashboard"
        meta={`KST · 2026.04.19 08:00`}
        right={
          !isMobile ? (
            <>
              <RangeToggle value={range} onChange={setRange} />
              <button
                className="btn"
                style={{ padding: 8, borderRadius: 8 }}
                type="button"
                title="Refresh"
              >
                <Icon name="refresh" size={14} />
              </button>
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
          <button className="btn" style={{ padding: '6px 8px', borderRadius: 8 }} type="button">
            <Icon name="refresh" size={12} />
          </button>
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
          style={{ position: 'relative', padding: isMobile ? 20 : 28, overflow: 'hidden' }}
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
                <KpiInline label="CUMULATIVE TWR" value={fmt.pct(summary.cumulativeTwr)} pos />
                <KpiInline label="YTD" value={fmt.pct(summary.ytd)} pos />
                <KpiInline
                  label="매달·이자 누적"
                  value={`+${summary.monthlyPnl.toLocaleString()}원`}
                  pos
                />
                <KpiInline label="USD/KRW" value={`₩ ${summary.usdkrw.toFixed(2)}`} />
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
            value={fmt.krwShort(summary.koreanAssets.value)}
            footer={
              <>
                <span className="pos">▲ +{summary.koreanAssets.deltaPct}%</span>{' '}
                <span className="muted">this month</span>
              </>
            }
          />
          <KpiCard
            color="var(--emerald)"
            label="US ASSETS"
            value={`$ ${summary.usAssets.value.toLocaleString()}`}
            footer={
              <>
                <span className="pos">▲ +{summary.usAssets.deltaPct}%</span>{' '}
                <span className="muted">this month</span>
              </>
            }
          />
          <KpiCard
            color="var(--rose)"
            label="DEBT · 부채"
            value={fmt.krwShort(summary.debt.value)}
            footer={<span className="muted">담보 이율 {summary.debt.ratePct}%</span>}
          />
          <KpiCard
            color="var(--violet)"
            label="DEPOSIT · 보증금"
            value={fmt.krwShort(summary.deposit.value)}
            footer={<span className="muted">임대 · 만기 {summary.deposit.nextMaturity}</span>}
          />
        </div>

        {/* CHART + DONUT */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(0, 1fr)',
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
            <TrendChart series={trend} height={isMobile ? 200 : 260} />
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
                <LegendDot color="var(--accent)" label="순자산 (KRW 환산)" />
                <LegendDot color="var(--sky)" label="투자 원금·부채 입금 누적" />
              </div>
              <div className="mono" style={{ color: 'var(--text-2)' }}>
                누적 수익{' '}
                <span style={{ color: 'var(--accent-hi)' }}>₩+264M</span>
                <span style={{ marginLeft: 12 }}>
                  · TWR <span className="pos">+{summary.cumulativeTwr.toFixed(2)}%</span>
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <div className="serif" style={{ fontSize: 18 }}>
                자산 구성
              </div>
              <div className="label-caps" style={{ marginTop: 4 }}>
                ASSET ALLOCATION · BY {allocMode === '유형' ? 'TYPE' : 'CURRENCY'}
              </div>
            </div>
            <div className="seg" style={{ marginBottom: 20 }}>
              {(['유형', '통화'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAllocMode(m)}
                  className={allocMode === m ? 'active' : ''}
                >
                  {m}
                </button>
              ))}
            </div>
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
                data={allocation}
                size={160}
                total={fmt.krwShort(summary.netWorth)}
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
                {allocation.map((a) => (
                  <div
                    key={a.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: a.color,
                      }}
                    />
                    <div style={{ flex: 1, fontSize: 13 }}>{a.label}</div>
                    <div className="mono" style={{ fontSize: 13 }}>
                      {a.pct.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* INCOME HISTORY */}
        <div className="card" style={{ padding: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <div className="serif" style={{ fontSize: 18 }}>
                배당 · 이자 히스토리
              </div>
              <div className="label-caps" style={{ marginTop: 4 }}>
                MONTHLY INCOME · LAST 12 MONTHS
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <LegendDot color="var(--accent)" label="배당금" />
              <LegendDot color="var(--sky)" label="이자" />
            </div>
          </div>
          <IncomeBars data={income} height={isMobile ? 160 : 200} />
        </div>
      </div>
    </>
  )
}

export default DashboardPage
