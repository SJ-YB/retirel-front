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
 * 연동하지 않는 계좌(예: 우리은행 주택청약)의 납입액 수기 입력 섹션.
 *
 * 납입 일자와 금액을 입력하면 입금 거래로 기록되고, 이 계좌의 입금 내역과
 * 총 납입액을 보여준다. 잘못 입력한 납입은 행에서 삭제할 수 있다.
 */
function AccountDepositSection({ bank, number }: AccountDepositSectionProps) {
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
      showToast({ message: '납입 내역을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [bank, number, showToast])

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
      showToast({ message: '납입 내역을 추가했습니다', type: 'success' })
      setAmount(null)
      await fetchDeposits()
    } catch {
      showToast({ message: '납입 내역을 추가하지 못했습니다', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiClient.delete(`/v1/transactions/${encodeURIComponent(id)}`)
      showToast({ message: '납입 내역을 삭제했습니다', type: 'success' })
      await fetchDeposits()
    } catch {
      showToast({ message: '납입 내역을 삭제하지 못했습니다', type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        납입 내역
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        이 계좌는 금융사 연동을 하지 않습니다. 납입할 때마다 일자와 금액을 직접
        입력해주세요.
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="small" wrap>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            총 납입액
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
            aria-label="납입일"
            value={depositedOn}
            max={today()}
            onChange={(e) => setDepositedOn(e.target.value)}
            style={{ width: 160 }}
          />
          <InputNumber<number>
            aria-label="납입 금액"
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
            납입 추가
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
                description="아직 입력한 납입 내역이 없습니다"
              />
            ),
          }}
          columns={[
            { title: '납입일', dataIndex: 'date', key: 'date' },
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
                    title="납입 내역 삭제"
                    description={`${row.date} ${fmt.krw(row.amount)} 납입을 삭제할까요?`}
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
