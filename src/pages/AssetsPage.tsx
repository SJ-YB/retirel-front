import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from 'antd'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { PaginatedResponse } from '../types/api'
import type { Debt, Deposit } from '../types/asset'
import type {
  AggregateResultResponse,
  ShareHoldingResponse,
} from '../types/holding'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { mockDebts, mockDeposits } from '../mocks/data'
import ShareAdjustmentSection from './assets/ShareAdjustmentSection'

type Tab = 'holdings' | 'debts' | 'deposits'
type Sort = '수량' | '종목명'

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
      <div
        className="mono"
        style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}
      >
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

/** 이 종목을 어느 계좌에서 들고 있는지. 여러 계좌면 개수만 보여준다. */
function accountLabel(holding: ShareHoldingResponse): string {
  if (holding.accounts.length === 1) return holding.accounts[0].number
  return `${holding.accounts.length}개 계좌`
}

function HoldingMobileCard({ h }: { h: ShareHoldingResponse }) {
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
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {h.name ?? ''}
          </div>
        </div>
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}
        >
          {accountLabel(h)} · {fmt.dateYmd(h.as_of)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
          {fmt.shares(Number(h.quantity))}
        </div>
        <div className="label-caps" style={{ fontSize: 9, marginTop: 2 }}>
          주
        </div>
      </div>
    </div>
  )
}

function HoldingRow({ h }: { h: ShareHoldingResponse }) {
  return (
    <tr>
      <td style={{ paddingLeft: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TickerBadge ticker={h.ticker} />
          <div>
            <div
              className="mono"
              style={{ fontSize: 12, color: 'var(--text)' }}
            >
              {h.ticker}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {h.name ?? ''}
            </div>
          </div>
        </div>
      </td>
      <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
        {accountLabel(h)}
      </td>
      <td className="mono" style={{ textAlign: 'right', fontSize: 13 }}>
        {fmt.shares(Number(h.quantity))}
      </td>
      <td
        className="mono"
        style={{
          textAlign: 'right',
          paddingRight: 20,
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        {fmt.dateYmd(h.as_of)}
      </td>
    </tr>
  )
}

function DebtCard({ d }: { d: Debt }) {
  const remaining = d.amount * (1 - d.progressPct / 100)
  return (
    <div
      className="card"
      style={{ position: 'relative', padding: 18, overflow: 'hidden' }}
    >
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
        상환 진행률 {d.progressPct}% · {(remaining / 1e6).toFixed(0)}M /{' '}
        {(d.amount / 1e6).toFixed(0)}M
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        <MiniStat label="금리" value={`${d.rate}% ${d.rateType}`} />
        <MiniStat
          label="월 상환"
          value={`${(d.monthlyPayment / 1e6).toFixed(2)}M`}
        />
        <MiniStat label="만기" value={d.maturity} />
      </div>
    </div>
  )
}

function DepositCard({ d }: { d: Deposit }) {
  return (
    <div
      className="card"
      style={{ position: 'relative', padding: 18, overflow: 'hidden' }}
    >
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

/**
 * 자산 화면.
 *
 * 보유 종목 탭은 백엔드가 거래내역을 누적해 집계해 둔 종목별 주식 수를 읽는다
 * (화면이 거래내역을 직접 훑지 않는다). 부채·임대 보증금은 아직 백엔드가 없어
 * mock으로 채운다.
 */
function AssetsPage() {
  const isMobile = useIsMobile()
  const { showToast } = useUiStore()
  const [tab, setTab] = useState<Tab>('holdings')
  const [sort, setSort] = useState<Sort>('수량')

  const [holdings, setHoldings] = useState<ShareHoldingResponse[]>([])
  const [loadingHoldings, setLoadingHoldings] = useState(true)
  const [aggregating, setAggregating] = useState(false)
  const [debts, setDebts] = useState<Debt[]>(mockDebts)
  const [deposits, setDeposits] = useState<Deposit[]>(mockDeposits)

  const fetchHoldings = useCallback(async () => {
    setLoadingHoldings(true)
    try {
      const { data } =
        await apiClient.get<ShareHoldingResponse[]>('/v1/holdings')
      setHoldings(data)
    } catch {
      showToast({ message: '보유 종목을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoadingHoldings(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  useEffect(() => {
    const load = async () => {
      try {
        const [d, dp] = await Promise.all([
          apiClient.get<PaginatedResponse<Debt>>('/assets/debts'),
          apiClient.get<PaginatedResponse<Deposit>>('/assets/deposits'),
        ])
        if (Array.isArray(d.data?.data)) setDebts(d.data.data)
        if (Array.isArray(dp.data?.data)) setDeposits(dp.data.data)
      } catch {
        // fall back to mocks already set
      }
    }
    load()
  }, [])

  // 집계는 로컬 DB만 다시 읽는 짧은 작업이라 응답을 기다렸다가 표를 새로 읽는다
  // (증권사 API를 호출하는 연동/종가 수집과 달리 폴링이 필요 없다).
  const handleAggregate = async () => {
    setAggregating(true)
    try {
      const { data } = await apiClient.post<AggregateResultResponse>(
        '/v1/holdings/aggregate',
      )
      showToast({
        message: `거래 ${data.trades}건을 집계했습니다`,
        type: 'info',
      })
      await fetchHoldings()
    } catch {
      showToast({ message: '집계 요청에 실패했습니다', type: 'error' })
    } finally {
      setAggregating(false)
    }
  }

  const displayedHoldings = useMemo(
    () =>
      [...holdings].sort((a, b) => {
        if (sort === '수량') return Number(b.quantity) - Number(a.quantity)
        return (a.name ?? a.ticker).localeCompare(b.name ?? b.ticker)
      }),
    [holdings, sort],
  )

  // 한 종목을 여러 계좌에 나눠 들고 있을 수 있어 계좌는 중복을 제거해 센다.
  const accountCount = useMemo(
    () =>
      new Set(
        holdings.flatMap((h) => h.accounts.map((a) => `${a.bank}:${a.number}`)),
      ).size,
    [holdings],
  )

  // 표가 어느 시점까지의 거래를 반영하는지. 종목별 마지막 변동일 중 가장 최근.
  const lastChangedAt = useMemo(
    () =>
      holdings.reduce<string | null>(
        (latest, h) => (latest == null || h.as_of > latest ? h.as_of : latest),
        null,
      ),
    [holdings],
  )

  const tabItems: { k: Tab; label: string; count: number; icon: IconName }[] = [
    {
      k: 'holdings',
      label: '투자 종목',
      count: holdings.length,
      icon: 'spark-up',
    },
    { k: 'debts', label: '부채', count: debts.length, icon: 'fee' },
    {
      k: 'deposits',
      label: '임대 보증금',
      count: deposits.length,
      icon: 'home',
    },
  ]

  return (
    <>
      <PageHeader
        title="Assets"
        meta={`${holdings.length} holdings · ${debts.length} debts · ${deposits.length} deposits`}
        right={
          <Button loading={aggregating} onClick={handleAggregate}>
            <Icon name="refresh" size={14} /> 집계
          </Button>
        }
      />

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
                  '2px solid ' +
                  (tab === t.k ? 'var(--accent)' : 'transparent'),
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
                label="보유 종목"
                sub="거래내역 누적 · 전량 매도분 제외"
                value={`${holdings.length}`}
              />
              <SummaryCard
                label="보유 계좌"
                sub="이 종목들을 들고 있는 계좌 수"
                value={`${accountCount}`}
              />
              <SummaryCard
                label="최종 변동"
                sub="수량이 마지막으로 바뀐 날"
                value={lastChangedAt ? fmt.dateYmd(lastChangedAt) : '—'}
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
                      — 거래내역 누적 주식 수
                    </span>
                  </div>
                </div>
                <div className="seg">
                  {(['수량', '종목명'] as const).map((s) => (
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
              {loadingHoldings && holdings.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    color: 'var(--text-3)',
                  }}
                >
                  보유 종목을 불러오는 중...
                </div>
              ) : holdings.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    color: 'var(--text-3)',
                  }}
                >
                  집계된 보유 종목이 없습니다. 계좌를 연동한 뒤 집계를
                  실행하세요
                </div>
              ) : isMobile ? (
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
                        <th style={{ textAlign: 'right' }}>보유 수량</th>
                        <th style={{ textAlign: 'right', paddingRight: 20 }}>
                          최종 변동일
                        </th>
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

            <ShareAdjustmentSection onChanged={fetchHoldings} />
          </>
        )}

        {tab === 'debts' && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(auto-fill, minmax(320px, 1fr))',
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
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(auto-fill, minmax(320px, 1fr))',
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
