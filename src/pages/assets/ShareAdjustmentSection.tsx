import { useCallback, useEffect, useState } from 'react'
import { Button, Popconfirm } from 'antd'
import axios from 'axios'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import type { ShareAdjustmentResponse } from '../../types/holding'

const BASE = '/v1/holdings/adjustments'

interface ShareAdjustmentSectionProps {
  // 조정을 등록·삭제하면 백엔드가 보유 수량을 다시 집계하므로, 표를 다시 읽는다.
  onChanged?: () => void | Promise<void>
}

const EMPTY_FORM = {
  ticker: '',
  effectiveDate: '',
  oldShares: '',
  newShares: '',
  memo: '',
}

/**
 * 액면분할·병합 등록 섹션.
 *
 * 분할·병합은 매매가 아니라서 증권사 체결내역에 남지 않는다. 거래내역만 누적하면
 * 그 비율만큼 보유 수량이 영구히 어긋나므로(전량 매도한 종목이 계속 보유 중으로
 * 보인다), 여기에 직접 등록해 집계가 반영하게 한다.
 */
function ShareAdjustmentSection({ onChanged }: ShareAdjustmentSectionProps) {
  const { showToast } = useUiStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const [adjustments, setAdjustments] = useState<ShareAdjustmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchAdjustments = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<ShareAdjustmentResponse[]>(BASE)
      setAdjustments(data)
    } catch {
      showToast({ message: '수량 조정을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAdjustments()
  }, [fetchAdjustments])

  const set = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.ticker.trim() || !form.effectiveDate) {
      showToast({ message: '종목코드와 적용일을 입력하세요', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post(BASE, {
        ticker: form.ticker.trim(),
        effective_date: form.effectiveDate,
        // Decimal 자릿수가 새지 않도록 문자열 그대로 보낸다.
        old_shares: form.oldShares.trim(),
        new_shares: form.newShares.trim(),
        memo: form.memo.trim() || null,
      })
      showToast({
        message: '등록했습니다. 보유 수량을 다시 집계했습니다',
        type: 'success',
      })
      setForm(EMPTY_FORM)
      await fetchAdjustments()
      await onChanged?.()
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      const detail = axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      const message =
        status === 409
          ? '이미 등록된 종목·적용일입니다'
          : (detail ?? '수량 조정을 등록하지 못했습니다')
      showToast({ message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (row: ShareAdjustmentResponse) => {
    try {
      await apiClient.delete(
        `${BASE}/${encodeURIComponent(row.ticker)}/${row.effective_date}`,
      )
      showToast({
        message: '삭제했습니다. 보유 수량을 다시 집계했습니다',
        type: 'success',
      })
      await fetchAdjustments()
      await onChanged?.()
    } catch {
      showToast({ message: '수량 조정을 삭제하지 못했습니다', type: 'error' })
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 12px' }}>
        <div className="serif" style={{ fontSize: 18 }}>
          액면분할 · 병합{' '}
          <span className="muted" style={{ fontSize: 12 }}>
            — 매매 없이 바뀐 주식 수
          </span>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
          분할·병합은 매매가 아니라서 증권사 체결내역에 남지 않습니다. 등록하지
          않으면 그 비율만큼 보유 수량이 계속 어긋납니다(다 판 종목이 남아 있는
          것처럼 보입니다). 비율은 &quot;전 몇 주가 후 몇 주가 되는가&quot;로
          적습니다 — 1:2 액면병합이면 전 2주, 후 1주입니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'end',
          padding: '0 20px 16px',
        }}
      >
        <label style={{ flex: '1 1 140px' }}>
          <span className="label-caps">종목코드</span>
          <input
            className="input"
            placeholder="예: IAU"
            value={form.ticker}
            onChange={(e) => set('ticker')(e.target.value)}
          />
        </label>
        <label style={{ flex: '1 1 150px' }}>
          <span className="label-caps">적용일</span>
          <input
            className="input"
            type="date"
            aria-label="적용일"
            value={form.effectiveDate}
            onChange={(e) => set('effectiveDate')(e.target.value)}
          />
        </label>
        <label style={{ flex: '0 1 90px' }}>
          <span className="label-caps">전</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="2"
            value={form.oldShares}
            onChange={(e) => set('oldShares')(e.target.value)}
          />
        </label>
        <label style={{ flex: '0 1 90px' }}>
          <span className="label-caps">후</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="1"
            value={form.newShares}
            onChange={(e) => set('newShares')(e.target.value)}
          />
        </label>
        <label style={{ flex: '1 1 160px' }}>
          <span className="label-caps">메모 (선택)</span>
          <input
            className="input"
            placeholder="근거·출처"
            value={form.memo}
            onChange={(e) => set('memo')(e.target.value)}
          />
        </label>
        <Button type="primary" htmlType="submit" loading={submitting}>
          등록
        </Button>
      </form>

      {loading && adjustments.length === 0 ? (
        <div
          style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}
        >
          수량 조정을 불러오는 중...
        </div>
      ) : adjustments.length === 0 ? (
        <div
          style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}
        >
          등록된 수량 조정이 없습니다
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>종목코드</th>
                <th>적용일</th>
                <th>비율</th>
                <th>메모</th>
                <th style={{ paddingRight: 20 }} aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {adjustments.map((row) => (
                <tr key={`${row.ticker}:${row.effective_date}`}>
                  <td style={{ paddingLeft: 20 }} className="mono">
                    {row.ticker}
                  </td>
                  <td>{row.effective_date}</td>
                  <td>
                    {row.old_shares} → {row.new_shares}
                  </td>
                  <td className="muted">{row.memo ?? '—'}</td>
                  <td style={{ textAlign: 'right', paddingRight: 20 }}>
                    <Popconfirm
                      title="수량 조정 삭제"
                      description="삭제하면 보유 수량을 다시 집계합니다."
                      okText="삭제"
                      okButtonProps={{ danger: true }}
                      cancelText="취소"
                      onConfirm={() => handleRemove(row)}
                    >
                      <Button size="small" danger type="text">
                        삭제
                      </Button>
                    </Popconfirm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ShareAdjustmentSection
