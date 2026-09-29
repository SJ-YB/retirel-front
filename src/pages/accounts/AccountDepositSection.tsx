import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Typography,
} from 'antd'
import dayjs from 'dayjs'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import type {
  ManualDepositApiRequest,
  TransactionApiResponse,
} from '../../types/transaction'
import { fmt } from '../../utils/format'

interface AccountDepositSectionProps {
  bank: string
  number: string
  /** 증권사 연동 계좌인지. 연동 계좌는 타행에서 이체한 예수금 입금을 기록한다. */
  linked?: boolean
}

interface DepositRow {
  id: string
  date: string
  amount: number
  manual: boolean
}

function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * 계좌 입금 수기 입력 섹션.
 *
 * - 연동하지 않는 계좌(예: 우리은행 주택청약): 납입액을 기록한다.
 * - 증권사 연동 계좌: 연동으로 들어오지 않는 타행 이체 예수금 입금을 기록한다.
 *
 * 일자와 금액을 입력하면 입금 거래로 기록되고, 이 계좌의 입금 내역과 합계를
 * 보여준다. 잘못 입력한 수기 입금은 행에서 삭제할 수 있다.
 */
function AccountDepositSection({
  bank,
  number,
  linked = false,
}: AccountDepositSectionProps) {
  const noun = linked ? '입금' : '납입'
  const { showToast } = useUiStore()
  const [rows, setRows] = useState<DepositRow[]>([])
  const [loading, setLoading] = useState(false)
  const [depositedOn, setDepositedOn] = useState<string>(today)
  const [amount, setAmount] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDeposits = useCallback(async () => {
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
              t.type === 'deposit',
          )
          .map((t) => ({
            id: t.id,
            date: t.traded_at,
            amount: Number(t.amount.amount),
            manual: t.manual,
          }))
          .sort((a, b) => b.date.localeCompare(a.date)),
      )
    } catch {
      showToast({
        message: `${noun} 내역을 불러오지 못했습니다`,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [bank, number, noun, showToast])

  useEffect(() => {
    fetchDeposits()
  }, [fetchDeposits])

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + row.amount, 0),
    [rows],
  )

  const canSubmit = !!depositedOn && amount != null && amount > 0

  const handleAdd = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload: ManualDepositApiRequest = {
        deposited_on: depositedOn,
        amount: String(amount),
      }
      await apiClient.post(
        `/v1/accounts/${encodeURIComponent(bank)}/${encodeURIComponent(
          number,
        )}/deposits`,
        payload,
      )
      showToast({ message: `${noun} 내역을 추가했습니다`, type: 'success' })
      setAmount(null)
      await fetchDeposits()
    } catch {
      showToast({
        message: `${noun} 내역을 추가하지 못했습니다`,
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiClient.delete(`/v1/transactions/${encodeURIComponent(id)}`)
      showToast({ message: `${noun} 내역을 삭제했습니다`, type: 'success' })
      await fetchDeposits()
    } catch {
      showToast({
        message: `${noun} 내역을 삭제하지 못했습니다`,
        type: 'error',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {linked ? '타행 이체 입금' : '납입 내역'}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        {linked
          ? '다른 은행에서 이 계좌로 이체한 예수금은 연동으로 들어오지 않습니다. 이체할 때마다 일자와 금액을 입력하면 거래내역에 외부입금으로 기록됩니다.'
          : '이 계좌는 금융사 연동을 하지 않습니다. 납입할 때마다 일자와 금액을 직접 입력해주세요.'}
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="small" wrap>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            총 {noun}액
          </Typography.Text>
          <Typography.Text strong data-testid="deposit-total">
            {fmt.krw(total)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            · {rows.length}회
          </Typography.Text>
        </Space>

        <Space size="small" wrap>
          <Input
            type="date"
            aria-label={`${noun}일`}
            value={depositedOn}
            max={today()}
            onChange={(e) => setDepositedOn(e.target.value)}
            style={{ width: 160 }}
          />
          <InputNumber<number>
            aria-label={`${noun} 금액`}
            placeholder="금액(원)"
            min={1}
            precision={0}
            value={amount}
            onChange={(value) => setAmount(value)}
            formatter={(value) =>
              value ? Number(value).toLocaleString('en-US') : ''
            }
            parser={(value) => Number((value ?? '').replace(/[^\d]/g, ''))}
            style={{ width: 160 }}
          />
          <Button
            type="primary"
            onClick={handleAdd}
            loading={submitting}
            disabled={!canSubmit}
          >
            {noun} 추가
          </Button>
        </Space>

        <Table<DepositRow>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={rows.length > 10 ? { pageSize: 10 } : false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`아직 입력한 ${noun} 내역이 없습니다`}
              />
            ),
          }}
          columns={[
            { title: `${noun}일`, dataIndex: 'date', key: 'date' },
            {
              title: '금액',
              dataIndex: 'amount',
              key: 'amount',
              align: 'right',
              render: (value: number) => fmt.krw(value),
            },
            {
              title: '',
              key: 'actions',
              width: 64,
              render: (_, row) =>
                row.manual ? (
                  <Popconfirm
                    title={`${noun} 내역 삭제`}
                    description={`${row.date} ${fmt.krw(row.amount)} ${noun}을 삭제할까요?`}
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
                ) : null,
            },
          ]}
        />
      </Space>
    </div>
  )
}

export default AccountDepositSection
