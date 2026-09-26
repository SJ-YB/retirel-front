import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { LoanFormValues, LoanRequest, LoanResponse } from '../types/loan'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import LoanFormModal from './loans/LoanFormModal'

const DAY_MS = 24 * 60 * 60 * 1000

// 만기까지 남은 일수. 오늘이 만기면 0, 지났으면 음수.
function daysToMaturity(iso: string, today: Date = new Date()): number {
  const maturity = new Date(iso + 'T00:00:00')
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((maturity.getTime() - base.getTime()) / DAY_MS)
}

function maturityLabel(days: number): string {
  if (days < 0) return `만기 ${-days}일 지남`
  if (days === 0) return '오늘 만기'
  return `D-${days}`
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

function LoanCard({
  loan,
  onClick,
}: {
  loan: LoanResponse
  onClick: () => void
}) {
  const principal = Number(loan.principal)
  const balance = Number(loan.balance)
  const repaidPct =
    principal > 0
      ? Math.max(0, Math.min(100, (1 - balance / principal) * 100))
      : 0
  const days = daysToMaturity(loan.maturity_date)
  const overdue = days < 0

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      aria-label={`${loan.alias} 수정`}
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
      <div
        className="stripe"
        style={{
          background: overdue ? 'var(--rose, #f43f5e)' : 'var(--accent)',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            {loan.account}
          </div>
          <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>
            {loan.alias}
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 4,
            background: 'var(--accent-dim)',
            color: 'var(--accent-hi)',
            flexShrink: 0,
          }}
        >
          연 {loan.interest_rate}%
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
        {fmt.won(balance)}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        원금 {fmt.won(principal)} · 상환 {repaidPct.toFixed(0)}%
      </div>

      <div className="hr" style={{ margin: '16px 0 12px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            만기일
          </div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--text)' }}>
            {fmt.dateYmd(loan.maturity_date)}
          </div>
        </div>
        <div>
          <div className="label-caps" style={{ fontSize: 9 }}>
            남은 기간
          </div>
          <div
            className="mono"
            style={{
              fontSize: 13,
              color: overdue ? 'var(--rose, #f43f5e)' : 'var(--text-2)',
            }}
          >
            {maturityLabel(days)}
          </div>
        </div>
      </div>
    </div>
  )
}

function toRequest(values: LoanFormValues): LoanRequest {
  return {
    alias: values.alias.trim(),
    account: values.account.trim(),
    principal: String(values.principal),
    interest_rate: String(values.interest_rate),
    balance: String(values.balance),
    maturity_date: values.maturity_date,
  }
}

/**
 * 대출(원금·별칭·계좌·금리·잔액·만기일)을 직접 등록·수정·삭제하는 화면.
 *
 * 증권 계좌와 달리 연동 경로가 없어 사용자가 손으로 관리한다. 잔액은 상환할 때마다
 * 수정 모달에서 갱신한다.
 */
function LoansPage() {
  const isMobile = useIsMobile()
  const { showToast } = useUiStore()

  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<LoanResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<LoanResponse[]>('/v1/loans')
      setLoans(Array.isArray(data) ? data : [])
    } catch {
      showToast({ message: '대출 목록을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const totals = useMemo(() => {
    const balance = loans.reduce((sum, l) => sum + Number(l.balance), 0)
    const principal = loans.reduce((sum, l) => sum + Number(l.principal), 0)
    // 잔액 가중 평균 금리. 잔액이 모두 0이면 단순 평균으로 대신한다.
    const weighted = loans.reduce(
      (sum, l) => sum + Number(l.balance) * Number(l.interest_rate),
      0,
    )
    const avgRate =
      balance > 0
        ? weighted / balance
        : loans.length > 0
          ? loans.reduce((s, l) => s + Number(l.interest_rate), 0) /
            loans.length
          : 0
    // 목록은 만기 오름차순이므로 첫 항목이 가장 가까운 만기다.
    const nearest = loans.length > 0 ? loans[0].maturity_date : null
    return { balance, principal, avgRate, nearest }
  }, [loans])

  const handleCreate = () => {
    setEditingLoan(null)
    setModalOpen(true)
  }

  const handleEdit = (loan: LoanResponse) => {
    setEditingLoan(loan)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingLoan(null)
  }

  const handleSubmit = async (values: LoanFormValues) => {
    setSubmitting(true)
    try {
      const payload = toRequest(values)
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

  const handleDelete = async () => {
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

  const newButton = (
    <button
      className="btn primary"
      type="button"
      onClick={handleCreate}
      style={isMobile ? { flex: 1, justifyContent: 'center' } : undefined}
    >
      <Icon name="plus" size={isMobile ? 12 : 14} /> New Loan
    </button>
  )

  return (
    <>
      <PageHeader
        title="Loans"
        meta={`${loans.length} loans · 원금 · 금리 · 잔액 · 만기`}
        right={!isMobile ? newButton : undefined}
      />

      {isMobile && (
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 12px' }}>
          {newButton}
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
            label="TOTAL BALANCE"
            value={fmt.krwShort(totals.balance)}
            accent
          />
          <SumItem
            label="TOTAL PRINCIPAL"
            value={fmt.krwShort(totals.principal)}
          />
          <SumItem label="AVG RATE" value={`${totals.avgRate.toFixed(2)}%`} />
          <SumItem
            label="NEAREST MATURITY"
            value={totals.nearest ? fmt.dateYmd(totals.nearest) : '-'}
          />
        </div>

        {loading && loans.length === 0 ? (
          <div
            className="card"
            style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
          >
            대출 목록을 불러오는 중...
          </div>
        ) : loans.length === 0 ? (
          <div
            className="card"
            style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
          >
            등록된 대출이 없습니다
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onClick={() => handleEdit(loan)}
              />
            ))}
          </div>
        )}
      </div>

      <LoanFormModal
        open={modalOpen}
        loan={editingLoan}
        onClose={handleClose}
        onSubmit={handleSubmit}
        onDelete={editingLoan ? handleDelete : undefined}
        loading={submitting}
        deleting={deleting}
      />
    </>
  )
}

export default LoansPage
