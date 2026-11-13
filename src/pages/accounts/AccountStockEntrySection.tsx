import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import type {
  ManualStockEntryApiRequest,
  TransactionApiResponse,
} from '../../types/transaction'

interface AccountStockEntrySectionProps {
  bank: string
  number: string
}

type Side = ManualStockEntryApiRequest['side']
type Currency = ManualStockEntryApiRequest['currency']

interface EntryRow {
  id: string
  date: string
  ticker: string
  name: string | null
  side: Side
  quantity: number
  unitPrice: number
  currency: string
}

const SIDE_LABELS: Record<Side, string> = { buy: '입고', sell: '출고' }

function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

function formatPrice(value: number, currency: string): string {
  const symbol = currency === 'usd' ? '$' : '₩'
  return symbol + value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/**
 * 증권사 체결내역에 남지 않는 주식 입출고를 직접 기록하는 섹션.
 *
 * 공모주 배정, 앱 데이터가 시작되기 전부터 보유하던 주식, 다른 계좌·증권사에서
 * 옮겨 온 주식은 연동으로 받을 수 없어 보유 수량이 어긋난다. 여기서 입력한
 * 내역은 수기 거래로 저장되어 보유 수량 집계와 스프레드시트 매매내역에 반영된다.
 */
function AccountStockEntrySection({
  bank,
  number,
}: AccountStockEntrySectionProps) {
  const { showToast } = useUiStore()
  const [rows, setRows] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [occurredOn, setOccurredOn] = useState<string>(today)
  const [ticker, setTicker] = useState('')
  const [side, setSide] = useState<Side>('buy')
  const [quantity, setQuantity] = useState<number | null>(null)
  const [unitPrice, setUnitPrice] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Currency>('krw')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data } =
        await apiClient.get<TransactionApiResponse[]>('/v1/transactions')
      const list = Array.isArray(data) ? data : []
      setRows(
        list
          .filter(
            (t) =>
              t.account.bank === bank &&
              t.account.number === number &&
              t.manual &&
              (t.type === 'buy' || t.type === 'sell'),
          )
          .map((t) => {
            const qty = Number(t.quantity ?? 0)
            return {
              id: t.id,
              date: t.traded_at,
              ticker: t.ticker ?? '',
              name: t.name,
              side: t.type as Side,
              quantity: qty,
              unitPrice: qty > 0 ? Number(t.amount.amount) / qty : 0,
              currency: t.amount.currency,
            }
          })
          .sort((a, b) => b.date.localeCompare(a.date)),
      )
    } catch {
      showToast({ message: '입출고 내역을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [bank, number, showToast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const canSubmit =
    !!occurredOn &&
    ticker.trim() !== '' &&
    quantity != null &&
    quantity > 0 &&
    unitPrice != null &&
    unitPrice >= 0

  const handleAdd = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload: ManualStockEntryApiRequest = {
        occurred_on: occurredOn,
        ticker: ticker.trim().toUpperCase(),
        quantity: String(quantity),
        unit_price: String(unitPrice),
        currency,
        side,
      }
      await apiClient.post(
        `/v1/accounts/${encodeURIComponent(bank)}/${encodeURIComponent(
          number,
        )}/stock-entries`,
        payload,
      )
      showToast({ message: '입출고 내역을 추가했습니다', type: 'success' })
      setTicker('')
      setQuantity(null)
      setUnitPrice(null)
      await fetchEntries()
    } catch {
      showToast({ message: '입출고 내역을 추가하지 못했습니다', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiClient.delete(`/v1/transactions/${encodeURIComponent(id)}`)
      showToast({ message: '입출고 내역을 삭제했습니다', type: 'success' })
      await fetchEntries()
    } catch {
      showToast({ message: '입출고 내역을 삭제하지 못했습니다', type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        주식 입출고 (수기)
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        공모주 배정, 앱 데이터 이전부터 보유하던 주식, 다른 계좌에서 옮겨 온
        주식처럼 체결내역에 없는 수량 변화를 입력하세요. 액면분할은 자산 화면의
        수량 조정에서 등록합니다.
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="small" wrap>
          <Input
            type="date"
            aria-label="입출고일"
            value={occurredOn}
            max={today()}
            onChange={(e) => setOccurredOn(e.target.value)}
            style={{ width: 150 }}
          />
          <Select<Side>
            aria-label="구분"
            value={side}
            onChange={setSide}
            options={[
              { value: 'buy', label: SIDE_LABELS.buy },
              { value: 'sell', label: SIDE_LABELS.sell },
            ]}
            style={{ width: 80 }}
          />
          <Input
            aria-label="종목코드"
            placeholder="종목코드 (예: 377300, AAPL)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            style={{ width: 200 }}
          />
          <InputNumber<number>
            aria-label="수량"
            placeholder="수량"
            min={0}
            value={quantity}
            onChange={(value) => setQuantity(value)}
            style={{ width: 100 }}
          />
          <InputNumber<number>
            aria-label="주당 가격"
            placeholder="주당 가격"
            min={0}
            value={unitPrice}
            onChange={(value) => setUnitPrice(value)}
            style={{ width: 130 }}
          />
          <Select<Currency>
            aria-label="통화"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'krw', label: 'KRW' },
              { value: 'usd', label: 'USD' },
            ]}
            style={{ width: 80 }}
          />
          <Button
            type="primary"
            onClick={handleAdd}
            loading={submitting}
            disabled={!canSubmit}
          >
            추가
          </Button>
        </Space>

        <Table<EntryRow>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={rows.length > 10 ? { pageSize: 10 } : false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="아직 입력한 입출고 내역이 없습니다"
              />
            ),
          }}
          columns={[
            { title: '일자', dataIndex: 'date', key: 'date' },
            {
              title: '종목',
              key: 'ticker',
              render: (_, row) => row.name ?? row.ticker,
            },
            {
              title: '구분',
              dataIndex: 'side',
              key: 'side',
              render: (value: Side) => SIDE_LABELS[value],
            },
            {
              title: '수량',
              dataIndex: 'quantity',
              key: 'quantity',
              align: 'right',
            },
            {
              title: '주당 가격',
              key: 'unitPrice',
              align: 'right',
              render: (_, row) => formatPrice(row.unitPrice, row.currency),
            },
            {
              title: '',
              key: 'actions',
              width: 64,
              render: (_, row) => (
                <Popconfirm
                  title="입출고 내역 삭제"
                  description={`${row.date} ${row.ticker} ${row.quantity}주를 삭제할까요?`}
                  okText="삭제"
                  okButtonProps={{ danger: true }}
                  cancelText="취소"
                  onConfirm={() => handleDelete(row.id)}
                >
                  <Button
                    danger
                    type="link"
                    size="small"
                    loading={deletingId === row.id}
                  >
                    삭제
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Space>
    </div>
  )
}

export default AccountStockEntrySection
