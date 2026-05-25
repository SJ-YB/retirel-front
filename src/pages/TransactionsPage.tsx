import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { Account, AccountApiResponse } from '../types/account'
import type {
  Transaction,
  TransactionApiResponse,
  TransactionKind,
  TransactionType,
} from '../types/transaction'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt, toKrw } from '../utils/format'
import { fromApiAccount } from '../utils/account'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'

// 백엔드(GET /v1/transactions) 응답을 화면용 Transaction으로 변환한다.
// 금액·수량은 Decimal이 문자열로 직렬화되므로 Number()로 파싱한다.
function fromApiTransaction(api: TransactionApiResponse): Transaction {
  return {
    id: api.id,
    accountId: `${api.account.bank}-${api.account.number}`,
    date: api.traded_at,
    type: api.type.toUpperCase() as TransactionType,
    ticker: api.ticker ?? '',
    quantity: api.quantity != null ? Number(api.quantity) : 0,
    amount: Number(api.amount.amount),
    fee: api.fee != null ? Number(api.fee.amount) : 0,
    tax: api.tax != null ? Number(api.tax.amount) : 0,
    memo: '',
    currency: api.amount.currency.toUpperCase(),
  }
}

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
  const { showToast } = useUiStore()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } =
        await apiClient.get<TransactionApiResponse[]>('/v1/transactions')
      setTransactions(Array.isArray(data) ? data.map(fromApiTransaction) : [])
    } catch {
      showToast({ message: '거래 내역을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await apiClient.get<AccountApiResponse[]>('/v1/accounts')
      setAccounts(Array.isArray(data) ? data.map(fromApiAccount) : [])
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

  return (
    <>
      <PageHeader
        title="Transactions"
        meta={`${filtered.length} of ${transactions.length} · YTD ${transactions.length + 460} tx`}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
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
      </div>
    </>
  )
}

export default TransactionsPage
