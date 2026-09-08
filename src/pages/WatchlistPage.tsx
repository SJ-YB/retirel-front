import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Popconfirm, Select } from 'antd'
import axios from 'axios'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import { useIsMobile } from '../hooks/useIsMobile'
import type {
  AddWatchedStockRequest,
  Market,
  WatchedStockResponse,
} from '../types/watchlist'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'

const MARKETS: { value: Market; label: string }[] = [
  { value: 'krx', label: '국내 (KRX)' },
  { value: 'nas', label: '나스닥 (NAS)' },
  { value: 'nys', label: '뉴욕 (NYS)' },
  { value: 'ams', label: '아멕스 (AMS)' },
]

const MARKET_LABEL: Record<Market, string> = {
  krx: 'KRX',
  nas: 'NAS',
  nys: 'NYS',
  ams: 'AMS',
}

// 시장별 종목코드 입력 힌트. 백엔드 검증 규칙과 같은 형식을 안내한다.
const TICKER_PLACEHOLDER: Record<Market, string> = {
  krx: '005930 (6자리)',
  nas: 'NVDA',
  nys: 'BRK.B',
  ams: 'SPY',
}

function watchedKey(stock: WatchedStockResponse): string {
  return `${stock.market}:${stock.ticker}`
}

function formatCreatedAt(iso: string | null): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y} ${m} ${d}`
}

function WatchedStockRow({
  stock,
  removing,
  onRemove,
}: {
  stock: WatchedStockResponse
  removing: boolean
  onRemove: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 4px',
        borderTop: '1px solid var(--border)',
      }}
    >
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
        {MARKET_LABEL[stock.market]}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="mono" style={{ fontSize: 14, color: 'var(--text)' }}>
          {stock.ticker}
        </div>
        {stock.name && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {stock.name}
          </div>
        )}
      </div>

      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        {formatCreatedAt(stock.created_at)}
      </div>

      <Popconfirm
        title="관찰 대상에서 해제할까요?"
        okText="해제"
        cancelText="취소"
        onConfirm={onRemove}
      >
        <Button
          danger
          size="small"
          loading={removing}
          aria-label={`${stock.ticker} 해제`}
        >
          해제
        </Button>
      </Popconfirm>
    </div>
  )
}

/**
 * 배당·분배 정보를 수집할 관찰 종목을 등록·해제하는 화면.
 *
 * 종목코드 정규화(대문자·공백 제거)와 형식 검증은 백엔드가 담당하므로, 여기서는
 * 입력을 그대로 보내고 응답(400/409)을 메시지로 옮긴다.
 */
function WatchlistPage() {
  const { showToast } = useUiStore()
  const isMobile = useIsMobile()

  const [stocks, setStocks] = useState<WatchedStockResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  const [market, setMarket] = useState<Market>('krx')
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')

  const fetchStocks = useCallback(async () => {
    setLoading(true)
    try {
      const { data } =
        await apiClient.get<WatchedStockResponse[]>('/v1/watchlist')
      setStocks(data)
    } catch {
      showToast({ message: '관찰 종목을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  const handleAdd = async () => {
    const trimmed = ticker.trim()
    if (!trimmed) {
      showToast({ message: '종목코드를 입력하세요', type: 'warning' })
      return
    }

    setSubmitting(true)
    try {
      const payload: AddWatchedStockRequest = { market, ticker: trimmed }
      const trimmedName = name.trim()
      if (trimmedName) payload.name = trimmedName

      await apiClient.post('/v1/watchlist', payload)
      showToast({ message: '관찰 종목으로 등록했습니다', type: 'success' })
      setTicker('')
      setName('')
      await fetchStocks()
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      showToast({
        message:
          status === 409
            ? '이미 등록된 종목입니다'
            : status === 400
              ? '종목코드 형식이 올바르지 않습니다'
              : '등록에 실패했습니다',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (stock: WatchedStockResponse) => {
    setRemovingKey(watchedKey(stock))
    try {
      await apiClient.delete(
        `/v1/watchlist/${encodeURIComponent(stock.market)}/${encodeURIComponent(
          stock.ticker,
        )}`,
      )
      showToast({ message: '관찰 대상에서 해제했습니다', type: 'success' })
      await fetchStocks()
    } catch {
      showToast({ message: '해제에 실패했습니다', type: 'error' })
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Watchlist"
        meta={`${stocks.length} stocks · 배당 · 분배 수집 대상`}
      />

      <div
        style={{
          padding: isMobile ? '0 18px 100px' : '0 28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <div className="label-caps" style={{ marginBottom: 12 }}>
            ADD STOCK
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <Select
              value={market}
              options={MARKETS}
              onChange={(value) => setMarket(value)}
              style={{ width: isMobile ? '100%' : 160 }}
              aria-label="시장"
            />
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onPressEnter={handleAdd}
              placeholder={TICKER_PLACEHOLDER[market]}
              aria-label="종목코드"
              style={{ width: isMobile ? '100%' : 200 }}
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={handleAdd}
              placeholder="종목명 (선택)"
              aria-label="종목명"
              style={{ flex: 1 }}
            />
            <Button type="primary" loading={submitting} onClick={handleAdd}>
              <Icon name="plus" size={14} /> 등록
            </Button>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          {loading && stocks.length === 0 ? (
            <div
              style={{
                padding: 22,
                textAlign: 'center',
                color: 'var(--text-3)',
              }}
            >
              관찰 종목을 불러오는 중...
            </div>
          ) : stocks.length === 0 ? (
            <div
              style={{
                padding: 22,
                textAlign: 'center',
                color: 'var(--text-3)',
              }}
            >
              등록된 관찰 종목이 없습니다
            </div>
          ) : (
            stocks.map((stock) => (
              <WatchedStockRow
                key={watchedKey(stock)}
                stock={stock}
                removing={removingKey === watchedKey(stock)}
                onRemove={() => handleRemove(stock)}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default WatchlistPage
