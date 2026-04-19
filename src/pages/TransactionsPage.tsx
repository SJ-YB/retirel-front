import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { Account } from '../types/account'
import type {
  CreateTransactionRequest,
  Transaction,
  TransactionKind,
  TransactionType,
} from '../types/transaction'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt, toKrw } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import NewTxDrawer from './transactions/NewTxDrawer'

const FILTERS: { k: 'all' | TransactionKind; label: string; color: string }[] = [
  { k: 'all', label: '전체', color: 'var(--text-3)' },
  { k: '매수', label: '매수', color: 'var(--sky)' },
  { k: '매도', label: '매도', color: 'var(--rose)' },
  { k: '배당금', label: '배당', color: 'var(--emerald)' },
  { k: '외부입금', label: '외부입금', color: 'var(--violet)' },
]

const KIND_COLORS: Record<TransactionKind, string> = {
  매수: 'var(--sky)',
  매도: 'var(--rose)',
  배당금: 'var(--emerald)',
  이자: 'var(--accent)',
  외부입금: 'var(--violet)',
  출금: 'var(--text-3)',
  숏: 'var(--rose)',
  부채: 'var(--rose)',
  보증금: 'var(--accent)',
}

const KIND_ICONS: Record<TransactionKind, IconName> = {
  매수: 'buy',
  매도: 'sell',
  배당금: 'dividend',
  이자: 'interest',
  외부입금: 'deposit',
  출금: 'withdraw',
  숏: 'short',
  부채: 'fee',
  보증금: 'home',
}

const TYPE_TO_KIND: Record<TransactionType, TransactionKind> = {
  BUY: '매수',
  SELL: '매도',
  DEPOSIT: '외부입금',
  WITHDRAWAL: '출금',
  DIVIDEND: '배당금',
  INTEREST: '이자',
  DEBT_REPAYMENT: '부채',
  DEPOSIT_CHANGE: '보증금',
  SHORT: '숏',
}

const TYPE_TO_SIGN: Record<TransactionType, '+' | '-'> = {
  BUY: '-',
  SELL: '+',
  DEPOSIT: '+',
  WITHDRAWAL: '-',
  DIVIDEND: '+',
  INTEREST: '+',
  DEBT_REPAYMENT: '-',
  DEPOSIT_CHANGE: '-',
  SHORT: '-',
}

function resolveKind(t: Transaction): TransactionKind {
  return t.kind ?? TYPE_TO_KIND[t.type]
}

function resolveSign(t: Transaction): '+' | '-' {
  return t.sign ?? TYPE_TO_SIGN[t.type]
}

function TxRow({
  t,
  accountMap,
  isMobile,
}: {
  t: Transaction
  accountMap: Map<string, Account>
  isMobile: boolean
}) {
  const kind = resolveKind(t)
  const sign = resolveSign(t)
  const account = accountMap.get(t.accountId)
  const ccy = (t.currency ?? account?.currency ?? 'KRW') as 'KRW' | 'USD'
  const title = t.ticker
    ? `${t.ticker}${t.memo ? ` — ${t.memo.split(' · ')[0]}` : ''}`
    : kind
  const subParts: string[] = []
  if (account) subParts.push(account.name)
  if (t.memo) subParts.push(t.memo)
  const quantityLabel = t.quantity > 0 ? `${t.quantity} 주` : null

  return (
    <div
      className="tx-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 10 : 14,
        padding: isMobile ? '12px 14px' : '14px 20px',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          color: KIND_COLORS[kind],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={KIND_ICONS[kind]} size={16} />
      </div>
      {!isMobile && (
        <div style={{ width: 56, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{kind}</div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isMobile && quantityLabel
            ? `${quantityLabel}${subParts.length ? ' · ' + subParts[0] : ''}`
            : subParts.join(' · ') || '—'}
        </div>
      </div>
      {!isMobile && (
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--text-2)',
            textAlign: 'right',
            flexShrink: 0,
            width: 60,
          }}
        >
          {t.quantity > 0 ? `${t.quantity} 주` : '—'}
        </div>
      )}
      <div
        className="mono"
        style={{
          fontSize: isMobile ? 13 : 14,
          fontVariantNumeric: 'tabular-nums',
          color: sign === '+' ? 'var(--pos)' : 'var(--text)',
          minWidth: isMobile ? 90 : 110,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {sign} {fmt.money(t.amount, ccy)}
      </div>
    </div>
  )
}

function TransactionsPage() {
  const isMobile = useIsMobile()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | TransactionKind>('all')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(!isMobile)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useUiStore()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<PaginatedResponse<Transaction>>(
        '/transactions',
        { params: { page: 1, size: 50 } },
      )
      setTransactions(data.data)
    } catch {
      showToast({ message: '거래 내역을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts')
      setAccounts(data.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  )

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const kind = resolveKind(t)
      if (filter !== 'all' && kind !== filter) return false
      if (search) {
        const haystack = `${t.ticker} ${t.memo} ${kind} ${t.amount}`.toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [transactions, filter, search])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    filtered.forEach((t) => {
      const bucket = map.get(t.date) ?? []
      bucket.push(t)
      map.set(t.date, bucket)
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1))
  }, [filtered])

  const handleCreate = async (payload: CreateTransactionRequest) => {
    setSubmitting(true)
    try {
      await apiClient.post<ApiResponse<Transaction>>('/transactions', payload)
      showToast({ message: '거래가 등록되었습니다', type: 'success' })
      if (isMobile) setDrawerOpen(false)
      fetchTransactions()
    } catch {
      showToast({ message: '거래 등록에 실패했습니다', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        meta={`${filtered.length} of ${transactions.length} · YTD ${transactions.length + 460} tx`}
        right={
          !isMobile ? (
            <>
              <button className="btn" type="button">
                <Icon name="csv" size={14} /> CSV 업로드
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => setDrawerOpen(true)}
              >
                <Icon name="plus" size={14} /> New Transaction
              </button>
            </>
          ) : undefined
        }
      />

      {isMobile && (
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 12px' }}>
          <button
            className="btn"
            style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
            type="button"
          >
            <Icon name="csv" size={12} /> CSV
          </button>
          <button
            className="btn primary"
            style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
            type="button"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="plus" size={12} /> New
          </button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: !isMobile && drawerOpen ? 'minmax(0, 1fr) 380px' : 'minmax(0, 1fr)',
          gap: 16,
          padding: isMobile ? '0 18px 100px' : '0 28px 32px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Search + filters */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-3)',
                }}
              >
                <Icon name="search" size={14} />
              </div>
              <input
                className="input"
                placeholder="종목 · 금액 · 메모 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36, height: 44 }}
              />
            </div>
            <div
              style={{ display: 'flex', gap: 6, overflowX: 'auto' }}
              className="no-scrollbar"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setFilter(f.k)}
                  className={'chip' + (filter === f.k ? ' active' : '')}
                >
                  <span className="dot" style={{ background: f.color }} /> {f.label}
                  {f.k === 'all' && (
                    <span className="mono muted" style={{ marginLeft: 2 }}>
                      {transactions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                <div className="label-caps">Loading transactions…</div>
              </div>
            ) : groups.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                <div className="label-caps">No matching transactions</div>
              </div>
            ) : (
              groups.map(([date, items]) => {
                const dayTotal = items.reduce((sum, t) => {
                  const ccy = (t.currency ?? accountMap.get(t.accountId)?.currency ?? 'KRW') as 'KRW' | 'USD'
                  const krwAmount = toKrw(t.amount, ccy)
                  return sum + (resolveSign(t) === '+' ? krwAmount : -krwAmount)
                }, 0)
                return (
                  <div key={date}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        flexDirection: isMobile ? 'column' : 'row',
                        padding: isMobile ? '10px 14px' : '12px 20px',
                        background: 'rgba(255,255,255,0.015)',
                        borderBottom: '1px solid var(--border)',
                        gap: isMobile ? 2 : 0,
                      }}
                    >
                      <div className="serif" style={{ fontSize: isMobile ? 13 : 14, color: 'var(--text-2)' }}>
                        {fmt.dayLabel(date)}
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {items.length} transaction{items.length > 1 ? 's' : ''}
                        <span
                          style={{
                            marginLeft: 8,
                            color: dayTotal >= 0 ? 'var(--pos)' : 'var(--text-2)',
                          }}
                        >
                          {dayTotal >= 0 ? '+' : '−'} {fmt.krwShort(Math.abs(dayTotal))}
                        </span>
                      </div>
                    </div>
                    {items.map((t) => (
                      <TxRow key={t.id} t={t} accountMap={accountMap} isMobile={isMobile} />
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Desktop drawer */}
        {!isMobile && drawerOpen && (
          <div style={{ position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
            <NewTxDrawer
              accounts={accounts}
              onClose={() => setDrawerOpen(false)}
              onSubmit={handleCreate}
              loading={submitting}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(4,8,16,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxHeight: '92vh', overflow: 'auto' }}
          >
            <NewTxDrawer
              accounts={accounts}
              onClose={() => setDrawerOpen(false)}
              onSubmit={handleCreate}
              loading={submitting}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default TransactionsPage
