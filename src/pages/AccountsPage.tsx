import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { Account, CreateAccountRequest } from '../types/account'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt, toKrw } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import AccountFormModal from './accounts/AccountFormModal'

function SumItem({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className="label-caps" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className="serif num"
        style={{ fontSize: 20, color: accent ? 'var(--accent)' : 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  )
}

function AccountCard({
  account,
  onClick,
}: {
  account: Account
  onClick: () => void
}) {
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
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
      <div className="stripe" style={{ background: account.stripe }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            {account.bank} · {account.type}
          </div>
          <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
            {account.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-2)',
            }}
          >
            <Icon name="user" size={12} /> {account.owner}
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 4,
            background:
              account.currency === 'KRW' ? 'var(--accent-dim)' : 'rgba(110,231,168,0.14)',
            color: account.currency === 'KRW' ? 'var(--accent-hi)' : 'var(--emerald)',
          }}
        >
          {account.currency}
        </div>
      </div>

      <div
        className="serif num"
        style={{
          fontSize: 22,
          margin: '14px 0 4px',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {fmt.money(account.balance, account.currency)}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        {account.positions != null && account.positions > 0 ? (
          <>
            {account.positions} positions · <span className="pos">+{account.ytd}% YTD</span>
          </>
        ) : (
          <>현금 · 이자 {account.ytd ?? 0}%</>
        )}
      </div>

      <div className="hr" style={{ margin: '16px 0 12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            주식
          </div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
            {account.stocksPct ?? 0}%
          </div>
        </div>
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            현금
          </div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {account.cashPct ?? 0}%
          </div>
        </div>
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            거래
          </div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {account.txCount ?? 0}
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountsPage() {
  const isMobile = useIsMobile()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useUiStore()

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts')
      setAccounts(data.data)
    } catch {
      showToast({ message: '계좌 목록을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const totals = useMemo(() => {
    const totalKrw = accounts.reduce(
      (sum, a) => sum + toKrw(a.balance, a.currency),
      0,
    )
    const krwCount = accounts.filter((a) => a.currency === 'KRW').length
    const usdCount = accounts.filter((a) => a.currency === 'USD').length
    const owners = new Set(accounts.map((a) => a.owner))
    return { totalKrw, krwCount, usdCount, ownerCount: owners.size }
  }, [accounts])

  const handleCreate = () => {
    setEditingAccount(null)
    setModalOpen(true)
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingAccount(null)
  }

  const handleSubmit = async (values: CreateAccountRequest) => {
    setSubmitting(true)
    try {
      if (editingAccount) {
        await apiClient.put<ApiResponse<Account>>(`/accounts/${editingAccount.id}`, {
          name: values.name,
        })
        showToast({ message: '계좌가 수정되었습니다', type: 'success' })
      } else {
        await apiClient.post<ApiResponse<Account>>('/accounts', values)
        showToast({ message: '계좌가 등록되었습니다', type: 'success' })
      }
      handleClose()
      await fetchAccounts()
    } catch {
      showToast({ message: '요청 처리에 실패했습니다', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        meta={`${accounts.length} accounts · ${totals.ownerCount} owners`}
        right={
          !isMobile ? (
            <>
              <button className="btn" type="button">
                <Icon name="export" size={14} /> Export
              </button>
              <button className="btn primary" type="button" onClick={handleCreate}>
                <Icon name="plus" size={14} /> New Account
              </button>
            </>
          ) : undefined
        }
      />

      {isMobile && (
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 12px' }}>
          <button
            className="btn"
            style={{ flex: 1, justifyContent: 'center' }}
            type="button"
          >
            <Icon name="export" size={12} /> Export
          </button>
          <button
            className="btn primary"
            style={{ flex: 1, justifyContent: 'center' }}
            type="button"
            onClick={handleCreate}
          >
            <Icon name="plus" size={12} /> New Account
          </button>
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
        {/* Summary bar */}
        <div
          className="card"
          style={{
            padding: 18,
            display: 'flex',
            gap: isMobile ? 20 : 48,
            flexWrap: 'wrap',
          }}
        >
          <SumItem label="TOTAL ASSETS" value={fmt.krwShort(totals.totalKrw)} accent />
          <SumItem label="KRW ACCOUNTS" value={totals.krwCount} />
          <SumItem label="USD ACCOUNTS" value={totals.usdCount} />
          <SumItem label="LAST ACTIVITY" value="2h ago" />
        </div>

        {loading && accounts.length === 0 ? (
          <div
            className="card"
            style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
          >
            계좌 목록을 불러오는 중...
          </div>
        ) : accounts.length === 0 ? (
          <div
            className="card"
            style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
          >
            등록된 계좌가 없습니다
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            {accounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} onClick={() => handleEdit(acc)} />
            ))}
          </div>
        )}
      </div>

      <AccountFormModal
        open={modalOpen}
        account={editingAccount}
        onClose={handleClose}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </>
  )
}

export default AccountsPage
