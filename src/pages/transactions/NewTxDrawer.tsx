import { useMemo, useState } from 'react'

import type { Account } from '../../types/account'
import type {
  CreateTransactionRequest,
  TransactionType,
} from '../../types/transaction'
import Icon from '../../components/ui/Icon'
import type { IconName } from '../../components/ui/Icon'

interface TypeOption {
  type: TransactionType
  label: string
  icon: IconName
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: 'BUY', label: '매수', icon: 'buy' },
  { type: 'SELL', label: '매도', icon: 'sell' },
  { type: 'DIVIDEND', label: '배당', icon: 'dividend' },
  { type: 'INTEREST', label: '이자', icon: 'interest' },
  { type: 'DEPOSIT', label: '입금', icon: 'deposit' },
  { type: 'SHORT', label: '숏', icon: 'short' },
  { type: 'DEBT_REPAYMENT', label: '부채', icon: 'fee' },
  { type: 'DEPOSIT_CHANGE', label: '보증금', icon: 'home' },
]

interface NewTxDrawerProps {
  accounts: Account[]
  onClose: () => void
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>
  loading: boolean
}

function NewTxDrawer({ accounts, onClose, onSubmit, loading }: NewTxDrawerProps) {
  const [type, setType] = useState<TransactionType>('BUY')
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '')
  const [ticker, setTicker] = useState('NVDA')
  const [quantity, setQuantity] = useState('8')
  const [price, setPrice] = useState('928.55')
  const [date, setDate] = useState('2026-04-17')
  const [fee, setFee] = useState('2.40')
  const [memo, setMemo] = useState('')

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? accounts[0],
    [accounts, accountId],
  )

  const handleSave = async () => {
    if (!selectedAccount) return
    const qty = parseFloat(quantity) || 0
    const unit = parseFloat(price) || 0
    const payload: CreateTransactionRequest = {
      accountId: selectedAccount.id,
      date,
      type,
      ticker,
      quantity: qty,
      amount: qty && unit ? qty * unit : unit,
      currency: selectedAccount.currency,
      fee: parseFloat(fee) || 0,
      memo,
    }
    await onSubmit(payload)
  }

  return (
    <div
      className="card slide-in-right"
      style={{
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderRadius: '16px 16px 0 0',
      }}
    >
      <div
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: 'var(--border-hi)',
          margin: '-6px auto 0',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="serif" style={{ fontSize: 18, whiteSpace: 'nowrap' }}>
          새 거래 등록
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ color: 'var(--text-3)', padding: 4, flexShrink: 0 }}
          aria-label="닫기"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div>
        <div className="label-caps" style={{ marginBottom: 8 }}>
          거래 유형
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {TYPE_OPTIONS.map((opt) => {
            const active = type === opt.type
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => setType(opt.type)}
                style={{
                  padding: '10px 6px',
                  borderRadius: 8,
                  border: '1px solid ' + (active ? 'var(--accent-line)' : 'var(--border)'),
                  background: active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.02)',
                  color: active ? 'var(--accent-hi)' : 'var(--text-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  transition: 'all 0.15s',
                }}
              >
                <Icon name={opt.icon} size={14} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <label>계좌</label>
        <select
          className="select"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.bank} ({a.currency})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>종목 · 티커 검색 또는 직접 입력</label>
        <input
          className="input"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="NVDA, 005930, ..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field">
          <label>수량</label>
          <input
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="field">
          <label>단가</label>
          <input
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>일자</label>
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label>수수료 (자동)</label>
        <input
          className="input"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          ★ 증권사 기본 수수료 0.0325% 적용 · 수정 가능
        </div>
      </div>

      <div className="field">
        <label>메모 · 전략</label>
        <input
          className="input"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="AI 밸류에이션 전략 추가 매수"
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          className="btn"
          style={{ flex: 1, justifyContent: 'center' }}
          type="button"
          onClick={onClose}
          disabled={loading}
        >
          취소
        </button>
        <button
          className="btn primary"
          style={{ flex: 1, justifyContent: 'center' }}
          type="button"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '저장 중...' : '거래 등록'}
        </button>
      </div>

      <button
        className="btn"
        style={{ justifyContent: 'center', fontSize: 12 }}
        type="button"
      >
        <Icon name="upload" size={12} /> 과거 거래 일괄 등록
        <span className="muted" style={{ fontSize: 11 }}>
          {' '}
          · CSV 템플릿 다운로드
        </span>
      </button>
    </div>
  )
}

export default NewTxDrawer
