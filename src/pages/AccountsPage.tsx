import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type {
  Account,
  AccountApiResponse,
  CreateAccountApiRequest,
  CreateAccountRequest,
  UpdateAccountApiRequest,
} from '../types/account'
import type { LoanFormValues, LoanRequest, LoanResponse } from '../types/loan'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt, toKrw } from '../utils/format'
import { apiIdentity, fromApiAccount } from '../utils/account'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import AccountFormModal from './accounts/AccountFormModal'
import AccountKindSwitch from './accounts/AccountKindSwitch'
import type { AccountKind } from './accounts/AccountKindSwitch'
import LoanCard from './accounts/LoanCard'
import LoanFormModal from './accounts/LoanFormModal'

// 열려 있는 모달. 대출도 계좌이므로 같은 '계좌 등록' 진입점에서 종류를 골라 등록한다.
type ModalState =
  | { kind: 'brokerage'; account: Account | null }
  | { kind: 'loan'; loan: LoanResponse | null }

function toLoanRequest(values: LoanFormValues): LoanRequest {
  return {
    alias: values.alias.trim(),
    account: values.account.trim(),
    principal: String(values.principal),
    interest_rate: String(values.interest_rate),
    balance: String(values.balance),
    maturity_date: values.maturity_date,
  }
}

function SumItem({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div>
      <div className="label-caps" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className="serif num"
        style={{
          fontSize: 20,
          color: accent ? 'var(--accent)' : 'var(--text)',
        }}
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
              account.currency === 'KRW'
                ? 'var(--accent-dim)'
                : 'rgba(110,231,168,0.14)',
            color:
              account.currency === 'KRW'
                ? 'var(--accent-hi)'
                : 'var(--emerald)',
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
            {account.positions} positions ·{' '}
            <span className="pos">+{account.ytd}% YTD</span>
          </>
        ) : (
          <>현금 · 이자 {account.ytd ?? 0}%</>
        )}
      </div>

      <div className="hr" style={{ margin: '16px 0 12px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
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
          <div
            className="mono"
            style={{ fontSize: 13, color: 'var(--text-2)' }}
          >
            {account.cashPct ?? 0}%
          </div>
        </div>
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            거래
          </div>
          <div
            className="mono"
            style={{ fontSize: 13, color: 'var(--text-2)' }}
          >
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
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { showToast } = useUiStore()

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<AccountApiResponse[]>('/v1/accounts')
      setAccounts(Array.isArray(data) ? data.map(fromApiAccount) : [])
    } catch {
      showToast({ message: '계좌 목록을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchLoans = useCallback(async () => {
    try {
      const { data } = await apiClient.get<LoanResponse[]>('/v1/loans')
      setLoans(Array.isArray(data) ? data : [])
    } catch {
      showToast({ message: '대출 목록을 불러오지 못했습니다', type: 'error' })
    }
  }, [showToast])

  useEffect(() => {
    fetchAccounts()
    fetchLoans()
  }, [fetchAccounts, fetchLoans])

  const totals = useMemo(() => {
    const totalKrw = accounts.reduce(
      (sum, a) => sum + toKrw(a.balance, a.currency),
      0,
    )
    const krwCount = accounts.filter((a) => a.currency === 'KRW').length
    const usdCount = accounts.filter((a) => a.currency === 'USD').length
    const owners = new Set(accounts.map((a) => a.owner))
    const loanBalance = loans.reduce((sum, l) => sum + Number(l.balance), 0)
    return {
      totalKrw,
      krwCount,
      usdCount,
      ownerCount: owners.size,
      loanBalance,
    }
  }, [accounts, loans])

  const editingAccount = modal?.kind === 'brokerage' ? modal.account : null
  const editingLoan = modal?.kind === 'loan' ? modal.loan : null

  const handleCreate = () => {
    setModal({ kind: 'brokerage', account: null })
  }

  // 등록 모드에서 종류를 바꾸면 같은 자리에 다른 폼이 열린다.
  const handleKindChange = (kind: AccountKind) => {
    setModal(
      kind === 'loan'
        ? { kind: 'loan', loan: null }
        : { kind: 'brokerage', account: null },
    )
  }

  const handleEdit = (account: Account) => {
    setModal({ kind: 'brokerage', account })
  }

  const handleEditLoan = (loan: LoanResponse) => {
    setModal({ kind: 'loan', loan })
  }

  const handleClose = () => {
    setModal(null)
  }

  const kindSwitch = modal ? (
    <AccountKindSwitch value={modal.kind} onChange={handleKindChange} />
  ) : null

  const handleSubmitLoan = async (values: LoanFormValues) => {
    setSubmitting(true)
    try {
      const payload = toLoanRequest(values)
      if (editingLoan) {
        await apiClient.put(
          `/v1/loans/${encodeURIComponent(editingLoan.id)}`,
          payload,
        )
        showToast({ message: '대출이 수정되었습니다', type: 'success' })
      } else {
        await apiClient.post('/v1/loans', payload)
        showToast({ message: '대출이 등록되었습니다', type: 'success' })
      }
      handleClose()
      await fetchLoans()
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      showToast({
        message:
          status === 400
            ? '입력값이 올바르지 않습니다'
            : status === 404
              ? '이미 삭제된 대출입니다'
              : '요청 처리에 실패했습니다',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLoan = async () => {
    if (!editingLoan) return
    setDeleting(true)
    try {
      await apiClient.delete(`/v1/loans/${encodeURIComponent(editingLoan.id)}`)
      showToast({ message: '대출이 삭제되었습니다', type: 'success' })
      handleClose()
      await fetchLoans()
    } catch {
      showToast({ message: '대출 삭제에 실패했습니다', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (values: CreateAccountRequest) => {
    setSubmitting(true)
    try {
      if (editingAccount) {
        const { bank, number } = apiIdentity(editingAccount)
        const payload: UpdateAccountApiRequest = { nickname: values.name }
        await apiClient.patch(
          `/v1/accounts/${encodeURIComponent(bank)}/${encodeURIComponent(number)}`,
          payload,
        )
        showToast({ message: '계좌가 수정되었습니다', type: 'success' })
      } else {
        const payload: CreateAccountApiRequest = {
          number: values.accountNumber ?? '',
          owner_id: values.ownerName,
          bank: values.bank,
          nickname: values.name,
          type: values.type ?? 'brokerage',
        }
        await apiClient.post('/v1/accounts', payload)
        showToast({ message: '계좌가 등록되었습니다', type: 'success' })
      }
      handleClose()
      await fetchAccounts()
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      showToast({
        message:
          status === 409
            ? '이미 등록된 계좌입니다'
            : '요청 처리에 실패했습니다',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingAccount) return
    setDeleting(true)
    try {
      const { bank, number } = apiIdentity(editingAccount)
      await apiClient.delete(
        `/v1/accounts/${encodeURIComponent(bank)}/${encodeURIComponent(number)}`,
      )
      showToast({ message: '계좌가 삭제되었습니다', type: 'success' })
      handleClose()
      await fetchAccounts()
    } catch {
      showToast({ message: '계좌 삭제에 실패했습니다', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        meta={`${accounts.length} accounts · ${loans.length} loans · ${totals.ownerCount} owners`}
        right={
          !isMobile ? (
            <>
              <button className="btn" type="button">
                <Icon name="export" size={14} /> Export
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={handleCreate}
              >
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
          <SumItem
            label="TOTAL ASSETS"
            value={fmt.krwShort(totals.totalKrw)}
            accent
          />
          <SumItem label="KRW ACCOUNTS" value={totals.krwCount} />
          <SumItem label="USD ACCOUNTS" value={totals.usdCount} />
          <SumItem
            label="LOANS"
            value={`-${fmt.krwShort(totals.loanBalance)}`}
          />
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
              <AccountCard
                key={acc.id}
                account={acc}
                onClick={() => handleEdit(acc)}
              />
            ))}
          </div>
        )}

        {/* 대출은 일반 계좌 아래에 따로 묶는다. 잔액 부호가 반대라 섞이면 헷갈린다. */}
        {loans.length > 0 && (
          <>
            <div className="label-caps" style={{ marginTop: 8 }}>
              LOANS
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 16,
              }}
            >
              {loans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onClick={() => handleEditLoan(loan)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AccountFormModal
        open={modal?.kind === 'brokerage'}
        account={editingAccount}
        onClose={handleClose}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        loading={submitting}
        deleting={deleting}
        kindSwitch={kindSwitch}
      />

      <LoanFormModal
        open={modal?.kind === 'loan'}
        loan={editingLoan}
        onClose={handleClose}
        onSubmit={handleSubmitLoan}
        onDelete={editingLoan ? handleDeleteLoan : undefined}
        loading={submitting}
        deleting={deleting}
        kindSwitch={kindSwitch}
      />
    </>
  )
}

export default AccountsPage
