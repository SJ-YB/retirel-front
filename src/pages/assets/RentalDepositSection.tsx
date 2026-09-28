import { useState } from 'react'
import axios from 'axios'
import { Button } from 'antd'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import { useIsMobile } from '../../hooks/useIsMobile'
import type {
  RentalDepositFormValues,
  RentalDepositRequest,
  RentalDepositResponse,
} from '../../types/rentalDeposit'
import Icon from '../../components/ui/Icon'
import RentalDepositCard from './RentalDepositCard'
import RentalDepositFormModal from './RentalDepositFormModal'

function toRentalDepositRequest(
  values: RentalDepositFormValues,
): RentalDepositRequest {
  return {
    alias: values.alias.trim(),
    amount: String(values.amount),
    maturity_date: values.maturity_date,
  }
}

// 열려 있는 모달. deposit이 null이면 등록, 있으면 그 보증금의 수정.
type ModalState = { deposit: RentalDepositResponse | null }

/**
 * 임대 보증금 탭. 보증금을 수기로 등록·수정·삭제한다.
 *
 * 목록은 탭 개수 표시에도 쓰여 상위(자산 화면)가 불러오고, 바꾼 뒤에는
 * onChanged로 다시 읽게 한다.
 */
function RentalDepositSection({
  deposits,
  loading,
  onChanged,
}: {
  deposits: RentalDepositResponse[]
  loading: boolean
  onChanged: () => Promise<void>
}) {
  const isMobile = useIsMobile()
  const { showToast } = useUiStore()
  const [modal, setModal] = useState<ModalState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const editingDeposit = modal?.deposit ?? null

  const handleClose = () => {
    setModal(null)
  }

  const handleSubmit = async (values: RentalDepositFormValues) => {
    setSubmitting(true)
    try {
      const payload = toRentalDepositRequest(values)
      if (editingDeposit) {
        await apiClient.put(
          `/v1/rental-deposits/${encodeURIComponent(editingDeposit.id)}`,
          payload,
        )
        showToast({ message: '임대 보증금이 수정되었습니다', type: 'success' })
      } else {
        await apiClient.post('/v1/rental-deposits', payload)
        showToast({ message: '임대 보증금이 등록되었습니다', type: 'success' })
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
              ? '이미 삭제된 보증금입니다'
              : '요청 처리에 실패했습니다',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingDeposit) return
    setDeleting(true)
    try {
      await apiClient.delete(
        `/v1/rental-deposits/${encodeURIComponent(editingDeposit.id)}`,
      )
      showToast({ message: '임대 보증금이 삭제되었습니다', type: 'success' })
      handleClose()
      await onChanged()
    } catch {
      showToast({ message: '임대 보증금 삭제에 실패했습니다', type: 'error' })
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
          임대 보증금{' '}
          <span className="muted" style={{ fontSize: 12 }}>
            — 직접 입력
          </span>
        </div>
        <Button type="primary" onClick={() => setModal({ deposit: null })}>
          <Icon name="plus" size={14} /> 보증금 추가
        </Button>
      </div>

      {loading && deposits.length === 0 ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
        >
          임대 보증금을 불러오는 중...
        </div>
      ) : deposits.length === 0 ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}
        >
          등록된 임대 보증금이 없습니다
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
          {deposits.map((deposit) => (
            <RentalDepositCard
              key={deposit.id}
              deposit={deposit}
              onClick={() => setModal({ deposit })}
            />
          ))}
        </div>
      )}

      <RentalDepositFormModal
        open={modal !== null}
        deposit={editingDeposit}
        onClose={handleClose}
        onSubmit={handleSubmit}
        onDelete={editingDeposit ? handleDelete : undefined}
        loading={submitting}
        deleting={deleting}
      />
    </>
  )
}

export default RentalDepositSection
