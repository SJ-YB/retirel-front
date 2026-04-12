import { useCallback, useEffect, useState } from 'react'
import { DatePicker, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { Dayjs } from 'dayjs'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { Account } from '../types/account'
import type { Transaction, TransactionType } from '../types/transaction'
import type { PaginatedResponse } from '../types/api'

const { Title } = Typography
const { RangePicker } = DatePicker

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: '매수',
  SELL: '매도',
  DEPOSIT: '입금',
  WITHDRAWAL: '출금',
  DIVIDEND: '배당',
}

const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  BUY: 'blue',
  SELL: 'red',
  DEPOSIT: 'green',
  WITHDRAWAL: 'orange',
  DIVIDEND: 'purple',
}

function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0 })
  const [filterAccountId, setFilterAccountId] = useState<string | undefined>()
  const [filterType, setFilterType] = useState<TransactionType | undefined>()
  const [filterDateRange, setFilterDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const { showToast } = useUiStore()

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, size: pagination.size }
      if (filterAccountId) params.account_id = filterAccountId
      if (filterType) params.type = filterType
      if (filterDateRange?.[0]) params.from = filterDateRange[0].format('YYYY-MM-DD')
      if (filterDateRange?.[1]) params.to = filterDateRange[1].format('YYYY-MM-DD')

      const { data } = await apiClient.get<PaginatedResponse<Transaction>>('/transactions', { params })
      setTransactions(data.data)
      setPagination({ page: data.meta.page, size: data.meta.size, total: data.meta.totalElements })
    } catch {
      showToast({ message: '거래 내역을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [filterAccountId, filterType, filterDateRange, pagination.size, showToast])

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts')
      setAccounts(data.data)
    } catch {
      // silent - filter will just be empty
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    fetchTransactions(1)
  }, [fetchTransactions])

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    fetchTransactions(paginationConfig.current ?? 1)
  }

  const accountName = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    return account?.name ?? accountId
  }

  const columns: ColumnsType<Transaction> = [
    {
      title: '거래일',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: TransactionType) => (
        <Tag color={TRANSACTION_TYPE_COLORS[type]}>{TRANSACTION_TYPE_LABELS[type]}</Tag>
      ),
    },
    {
      title: '계좌',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 130,
      render: (accountId: string) => accountName(accountId),
    },
    {
      title: '종목',
      dataIndex: 'ticker',
      key: 'ticker',
      render: (ticker: string) => ticker || '-',
    },
    {
      title: '수량',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (quantity: number) => quantity > 0 ? quantity.toLocaleString() : '-',
    },
    {
      title: '금액',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (amount: number) =>
        new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount),
    },
    {
      title: '수수료',
      dataIndex: 'fee',
      key: 'fee',
      width: 100,
      align: 'right',
      render: (fee: number) => fee > 0 ? fee.toLocaleString() + '원' : '-',
    },
    {
      title: '세금',
      dataIndex: 'tax',
      key: 'tax',
      width: 100,
      align: 'right',
      render: (tax: number) => tax > 0 ? tax.toLocaleString() + '원' : '-',
    },
    {
      title: '메모',
      dataIndex: 'memo',
      key: 'memo',
      ellipsis: true,
      render: (memo: string) => memo || '-',
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>거래 내역</Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="계좌 선택"
          allowClear
          style={{ width: 160 }}
          value={filterAccountId}
          onChange={setFilterAccountId}
          options={accounts.map((a) => ({ label: a.name, value: a.id }))}
        />
        <Select
          placeholder="거래 유형"
          allowClear
          style={{ width: 120 }}
          value={filterType}
          onChange={setFilterType}
          options={Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ label, value }))}
        />
        <RangePicker
          value={filterDateRange}
          onChange={(dates) => setFilterDateRange(dates)}
          format="YYYY-MM-DD"
          placeholder={['시작일', '종료일']}
        />
      </Space>

      <Table<Transaction>
        columns={columns}
        dataSource={transactions}
        rowKey="id"
        loading={loading}
        onChange={handleTableChange}
        pagination={{
          current: pagination.page,
          pageSize: pagination.size,
          total: pagination.total,
          showSizeChanger: false,
          showTotal: (total) => `총 ${total}건`,
        }}
        locale={{ emptyText: '거래 내역이 없습니다' }}
      />
    </div>
  )
}

export default TransactionsPage
