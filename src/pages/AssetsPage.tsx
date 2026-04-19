import { useEffect, useMemo, useState } from 'react'

import { apiClient } from '../api'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import type { Holding, Debt, Deposit, AssetsSummary } from '../types/asset'
import type { Currency } from '../types/account'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt, toKrw } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import Sparkline from '../components/charts/Sparkline'
import {
  mockAssetsSummary,
  mockDebts,
  mockDeposits,
  mockHoldings,
} from '../mocks/data'

type Tab = 'holdings' | 'debts' | 'deposits'
type CurrencyFilter = '전체' | 'KRW' | 'USD'
type Sort = '평가액' | '수익률' | '종목명'

function SummaryCard({
  label,
  sub,
  value,
  valueClass,
}: {
  label: string
  sub: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="label-caps" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div
        className={'serif num ' + (valueClass ?? '')}
        style={{ fontSize: 26 }}
      >
        {value}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
        {sub}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-caps" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div
        className="mono"
        style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}
      >
        {value}
      </div>
    </div>
  )
}

const TICKER_BADGE_COLORS: Record<string, string> = {
  NV: 'var(--emerald)',
  '00': 'var(--accent)',
  VT: 'var(--sky)',
  SC: 'var(--sky)',
  '36': 'var(--accent)',
  AA: 'var(--violet)',
  '03': 'var(--rose)',
}

function tickerInitials(ticker: string): string {
  return ticker.length > 2 ? ticker.slice(0, 2) : ticker[0]
}

function TickerBadge({ ticker, shrink }: { ticker: string; shrink?: boolean }) {
  const initials = tickerInitials(ticker)
  const color = TICKER_BADGE_COLORS[initials] ?? 'var(--accent)'
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: color + '22',
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontFamily: 'var(--mono)',
        fontWeight: 600,
        letterSpacing: '0.02em',
        flexShrink: shrink ? 0 : undefined,
      }}
    >
      {initials}
    </div>
  )
}

function HoldingMobileCard({ h }: { h: Holding }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <TickerBadge ticker={h.ticker} shrink />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
            {h.ticker}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {h.name}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
          {h.quantity.toLocaleString()} × {h.currency === 'USD' ? `$${h.currentPrice.toFixed(2)}` : `₩${h.currentPrice.toLocaleString()}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
          {fmt.moneyShort(h.totalValue, h.currency)}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: h.returnPct >= 0 ? 'var(--pos)' : 'var(--neg)',
            marginTop: 2,
          }}
        >
          {fmt.pct(h.returnPct)}
        </div>
      </div>
    </div>
  )
}

function HoldingRow({ h }: { h: Holding }) {
  return (
    <tr>
      <td style={{ paddingLeft: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TickerBadge ticker={h.ticker} />
          <div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
              {h.ticker}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.name}</div>
          </div>
        </div>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{h.account}</td>
      <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
        {h.quantity.toLocaleString()}
      </td>
      <td className="mono" style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-2)' }}>
        {h.currency === 'USD' ? `$ ${h.avgPrice.toFixed(2)}` : `₩ ${h.avgPrice.toLocaleString()}`}
      </td>
      <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
        {h.currency === 'USD'
          ? `$ ${h.currentPrice.toFixed(2)}`
          : `₩ ${h.currentPrice.toLocaleString()}`}
      </td>
      <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
        {fmt.moneyShort(h.totalValue, h.currency)}
      </td>
      <td style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block' }}>
          <Sparkline data={h.trend24} />
        </div>
      </td>
      <td
        className="mono"
        style={{
          textAlign: 'right',
          paddingRight: 20,
          fontSize: 12,
          color: h.returnPct >= 0 ? 'var(--pos)' : 'var(--neg)',
        }}
      >
        {fmt.pct(h.returnPct)}
      </td>
    </tr>
  )
}

function DebtCard({ d }: { d: Debt }) {
  const remaining = d.amount * (1 - d.progressPct / 100)
  return (
    <div className="card" style={{ position: 'relative', padding: 18, overflow: 'hidden' }}>
      <div className="stripe" style={{ background: 'var(--rose)' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            대출 상품 · {d.bank}
          </div>
          <div className="serif" style={{ fontSize: 20 }}>
            {d.name}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 4,
            background: 'rgba(243,139,168,0.14)',
            color: 'var(--rose)',
          }}
        >
          {d.currency}
        </div>
      </div>
      <div
        className="serif num neg"
        style={{ fontSize: 28, margin: '14px 0 4px', letterSpacing: '-0.01em' }}
      >
        − {d.amount.toLocaleString()}원
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        상환 진행률 {d.progressPct}% · {(remaining / 1e6).toFixed(0)}M / {(d.amount / 1e6).toFixed(0)}M
      </div>

      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          margin: '12px 0 16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: d.progressPct + '%',
            height: '100%',
            background: 'var(--rose)',
            opacity: 0.85,
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <MiniStat label="금리" value={`${d.rate}% ${d.rateType}`} />
        <MiniStat label="월 상환" value={`${(d.monthlyPayment / 1e6).toFixed(2)}M`} />
        <MiniStat label="만기" value={d.maturity} />
      </div>
    </div>
  )
}

function DepositCard({ d }: { d: Deposit }) {
  return (
    <div className="card" style={{ position: 'relative', padding: 18, overflow: 'hidden' }}>
      <div className="stripe" style={{ background: 'var(--sky)' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            임대 · 선납 보증금
          </div>
          <div className="serif" style={{ fontSize: 20 }}>
            {d.property}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 4,
            background: 'var(--accent-dim)',
            color: 'var(--accent-hi)',
          }}
        >
          {d.currency}
        </div>
      </div>
      <div
        className="serif num pos"
        style={{ fontSize: 28, margin: '14px 0 4px', letterSpacing: '-0.01em' }}
      >
        + {d.amount.toLocaleString()}원
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        {d.address} · {d.note}
      </div>

      <div className="hr" style={{ margin: '16px 0 12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MiniStat label="계약" value={d.contractType} />
        <MiniStat label="만기" value={d.maturity} />
      </div>
    </div>
  )
}

function AssetsPage() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('holdings')
  const [ccyFilter, setCcyFilter] = useState<CurrencyFilter>('전체')
  const [sort, setSort] = useState<Sort>('평가액')

  const [holdings, setHoldings] = useState<Holding[]>(mockHoldings)
  const [debts, setDebts] = useState<Debt[]>(mockDebts)
  const [deposits, setDeposits] = useState<Deposit[]>(mockDeposits)
  const [summary, setSummary] = useState<AssetsSummary>(mockAssetsSummary)

  useEffect(() => {
    const load = async () => {
      try {
        const [h, d, dp, s] = await Promise.all([
          apiClient.get<PaginatedResponse<Holding>>('/assets/holdings'),
          apiClient.get<PaginatedResponse<Debt>>('/assets/debts'),
          apiClient.get<PaginatedResponse<Deposit>>('/assets/deposits'),
          apiClient.get<ApiResponse<AssetsSummary>>('/assets/summary'),
        ])
        setHoldings(h.data.data)
        setDebts(d.data.data)
        setDeposits(dp.data.data)
        setSummary(s.data.data)
      } catch {
        // fall back to mocks already set
      }
    }
    load()
  }, [])

  const displayedHoldings = useMemo(() => {
    const filtered =
      ccyFilter === '전체'
        ? holdings
        : holdings.filter((h) => h.currency === (ccyFilter as Currency))
    const sorted = [...filtered].sort((a, b) => {
      if (sort === '평가액') return toKrw(b.totalValue, b.currency) - toKrw(a.totalValue, a.currency)
      if (sort === '수익률') return b.returnPct - a.returnPct
      return a.ticker.localeCompare(b.ticker)
    })
    return sorted
  }, [holdings, ccyFilter, sort])

  const tabItems: { k: Tab; label: string; count: number; icon: IconName }[] = [
    { k: 'holdings', label: '투자 종목', count: holdings.length, icon: 'spark-up' },
    { k: 'debts', label: '부채', count: debts.length, icon: 'fee' },
    { k: 'deposits', label: '임대 보증금', count: deposits.length, icon: 'home' },
  ]

  return (
    <>
      <PageHeader
        title="Assets"
        meta={`${holdings.length} holdings · ${debts.length} debts · ${deposits.length} deposits`}
        right={
          !isMobile ? (
            <div className="seg">
              {(['전체', 'KRW', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCcyFilter(c)}
                  className={ccyFilter === c ? 'active' : ''}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {isMobile && (
        <div style={{ padding: '0 18px 12px' }}>
          <div className="seg" style={{ width: '100%' }}>
            {(['전체', 'KRW', 'USD'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCcyFilter(c)}
                className={ccyFilter === c ? 'active' : ''}
                style={{ flex: 1 }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          padding: isMobile ? '0 18px 100px' : '0 28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid var(--border)',
            overflowX: 'auto',
          }}
          className="no-scrollbar"
        >
          {tabItems.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                color: tab === t.k ? 'var(--text)' : 'var(--text-3)',
                borderBottom:
                  '2px solid ' + (tab === t.k ? 'var(--accent)' : 'transparent'),
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--text-3)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === 'holdings' && (
          <>
            <div
              className="grid"
              style={{
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 16,
              }}
            >
              <SummaryCard
                label="종목 평가액"
                sub="KRX + 해외 환산 ₩1,364.20"
                value={fmt.krwShort(summary.holdingsValue)}
              />
              <SummaryCard
                label="평균 수익률"
                sub="가중 평균 · 모든 계좌"
                value={fmt.pct(summary.averageYieldPct)}
                valueClass="pos"
              />
              <SummaryCard
                label="올해 누적 수입"
                sub="배당 yield 1.33% · 시장 기대"
                value={fmt.krwShort(summary.ytdIncome)}
              />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 20px 12px',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <div className="serif" style={{ fontSize: 18 }}>
                    보유 종목{' '}
                    <span className="muted" style={{ fontSize: 12 }}>
                      — Top positions
                    </span>
                  </div>
                </div>
                <div className="seg">
                  {(['평가액', '수익률', '종목명'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSort(s)}
                      className={sort === s ? 'active' : ''}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {isMobile ? (
                <div>
                  {displayedHoldings.map((h) => (
                    <HoldingMobileCard key={h.ticker} h={h} />
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 20 }}>티커</th>
                        <th>계좌</th>
                        <th style={{ textAlign: 'right' }}>수량</th>
                        <th style={{ textAlign: 'right' }}>평균가</th>
                        <th style={{ textAlign: 'right' }}>현재가</th>
                        <th style={{ textAlign: 'right' }}>평가액</th>
                        <th style={{ textAlign: 'center' }}>추이</th>
                        <th style={{ textAlign: 'right', paddingRight: 20 }}>수익률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedHoldings.map((h) => (
                        <HoldingRow key={h.ticker} h={h} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'debts' && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {debts.map((d) => (
              <DebtCard key={d.id} d={d} />
            ))}
          </div>
        )}

        {tab === 'deposits' && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {deposits.map((d) => (
              <DepositCard key={d.id} d={d} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default AssetsPage
