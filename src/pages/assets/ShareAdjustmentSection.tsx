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

// 서버가 거절한 이유를 사람이 읽을 문장으로 바꾼다.
//
// FastAPI는 detail의 모양이 두 가지다. 우리가 던진 HTTPException(400·409)은
// 문자열이지만, 요청 스키마 검증에 걸린 422는 오류 객체의 '배열'이다. 배열을
// 그대로 토스트에 넘기면 아무것도 안 보여서, 사용자 눈에는 버튼이 먹통인 것처럼
// 보인다(그래서 어느 칸이 잘못됐는지도 알 수 없다).
const FIELD_LABELS: Record<string, string> = {
  ticker: '종목코드',
  effective_date: '적용일',
  old_shares: '전 주식 수',
  new_shares: '후 주식 수',
  memo: '메모',
}

function requestErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback
  if (err.response?.status === 409) return '이미 등록된 종목·적용일입니다'

  const detail = (err.response?.data as { detail?: unknown } | undefined)
    ?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0] as { loc?: unknown[] } | undefined
    // loc은 ['body', '<필드명>'] 형태다. 마지막 조각이 문제가 된 필드다.
    const field = first?.loc?.[first.loc.length - 1]
    const label = typeof field === 'string' ? FIELD_LABELS[field] : undefined
    return label
      ? `${label}을(를) 올바르게 입력하세요`
      : '입력값이 올바르지 않습니다'
  }
  return fallback
}

const EMPTY_FORM = {
  ticker: '',
  effectiveDate: '',
  oldShares: '',
  newShares: '',
  memo: '',
}

// label은 기본이 inline이라 캡션과 입력칸이 한 줄에 붙는다. 열로 세워 둔다.
const FIELD_STYLE = (basis: number): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: `1 1 ${basis}px`,
})

/** 제출을 막아야 할 이유. 없으면 null. */
function validate(form: typeof EMPTY_FORM): string | null {
  if (!form.ticker.trim()) return '종목코드를 입력하세요'
  if (!form.effectiveDate) return '적용일을 입력하세요'
  for (const [value, label] of [
    [form.oldShares, '전'],
    [form.newShares, '후'],
  ] as const) {
    const trimmed = value.trim()
    if (!trimmed) return `분할·병합 ${label} 주식 수를 입력하세요`
    if (!Number.isFinite(Number(trimmed)) || Number(trimmed) <= 0) {
      return `분할·병합 ${label} 주식 수는 0보다 큰 숫자여야 합니다`
    }
  }
  return null
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
    // 비율 칸이 비면 서버는 422로 거절한다. 사용자에게는 어느 칸이 비었는지
    // 알려주는 편이 낫다(0·음수·1:1 같은 도메인 규칙은 서버가 판정한다).
    const invalid = validate(form)
    if (invalid) {
      showToast({ message: invalid, type: 'error' })
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
      showToast({
        message: requestErrorMessage(err, '수량 조정을 등록하지 못했습니다'),
        type: 'error',
      })
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
        <label style={FIELD_STYLE(140)}>
          <span className="label-caps">종목코드</span>
          <input
            className="input"
            placeholder="예: IAU"
            value={form.ticker}
            onChange={(e) => set('ticker')(e.target.value)}
          />
        </label>
        <label style={FIELD_STYLE(150)}>
          <span className="label-caps">적용일</span>
          <input
            className="input"
            type="date"
            aria-label="적용일"
            value={form.effectiveDate}
            onChange={(e) => set('effectiveDate')(e.target.value)}
          />
        </label>
        <label style={FIELD_STYLE(110)}>
          <span className="label-caps">병합·분할 전</span>
          <input
            className="input"
            inputMode="decimal"
            aria-label="분할·병합 전 주식 수"
            value={form.oldShares}
            onChange={(e) => set('oldShares')(e.target.value)}
          />
        </label>
        <label style={FIELD_STYLE(110)}>
          <span className="label-caps">병합·분할 후</span>
          <input
            className="input"
            inputMode="decimal"
            aria-label="분할·병합 후 주식 수"
            value={form.newShares}
            onChange={(e) => set('newShares')(e.target.value)}
          />
        </label>
        <label style={FIELD_STYLE(160)}>
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
