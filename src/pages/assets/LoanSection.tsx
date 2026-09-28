import { useState } from 'react'
import axios from 'axios'
import { Button } from 'antd'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import { useIsMobile } from '../../hooks/useIsMobile'
import type {
  LoanFormValues,
  LoanRequest,
  LoanResponse,
} from '../../types/loan'
import Icon from '../../components/ui/Icon'
import LoanCard from './LoanCard'
import LoanFormModal from './LoanFormModal'

function toLoanRequest(values: LoanFormValues): LoanRequest {
  return {
    alias: values.alias.trim(),
    principal: String(values.principal),
    interest_rate: String(values.interest_rate),
    maturity_date: values.maturity_date,
  }
}

// 열려 있는 모달. loan이 null이면 등록, 있으면 그 대출의 수정.
type ModalState = { loan: LoanResponse | null }

/**
 * 부채 탭. 대출을 수기로 등록·수정·삭제한다.
 *
 * 목록은 탭 개수 표시에도 쓰여 상위(자산 화면)가 불러오고, 바꾼 뒤에는
 * onChanged로 다시 읽게 한다.
 */
function LoanSection({
  loans,
  loading,
  onChanged,
}: {
  loans: LoanResponse[]
  loading: boolean
  onChanged: () => Promise<void>
}) {
  const isMobile = useIsMobile()
  const { showToast } = useUiStore()
  const [modal, setModal] = useState<ModalState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const editingLoan = modal?.loan ?? null

  const handleClose = () => {
    setModal(null)
  }

  const handleSubmit = async (values: LoanFormValues) => {
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
      await onChanged()
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
      await onChanged()
    } catch {
      showToast({ message: '대출 삭제에 실패했습니다', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div className="serif" style={{ fontSize: 18 }}>
          대출{' '}
          <span className="muted" style={{ fontSize: 12 }}>
            — 직접 입력
          </span>
        </div>
        <Button type="primary" onClick={() => setModal({ loan: null })}>
          <Icon name="plus" size={14} /> 대출 추가
        </Button>
      </div>

      {loading && loans.length === 0 ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
        >
          대출을 불러오는 중...
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
          className="grid"
          style={{
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onClick={() => setModal({ loan })}
            />
          ))}
        </div>
      )}

      <LoanFormModal
        open={modal !== null}
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

export default LoanSection
