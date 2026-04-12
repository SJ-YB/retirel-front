import { useEffect, useState } from 'react'
import { Button, Space, Table, Typography, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import apiClient from '../api/client'
import type { Account } from '../types/account'
import type { PaginatedResponse } from '../types/api'

const { Title } = Typography

const CURRENCY_LABELS: Record<string, string> = {
  KRW: '원 (KRW)',
  USD: '달러 (USD)',
  EUR: '유로 (EUR)',
  JPY: '엔 (JPY)',
}

function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts')
        setAccounts(data.data)
      } catch {
        message.error('계좌 목록을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  const columns: ColumnsType<Account> = [
    {
      title: '별칭',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '금융사',
      dataIndex: 'bank',
      key: 'bank',
    },
    {
      title: '소유자',
      dataIndex: 'owner',
      key: 'owner',
    },
    {
      title: '기본 통화',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency: string) => CURRENCY_LABELS[currency] ?? currency,
    },
    {
      title: '잔액',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (balance: number, record: Account) => {
        try {
          return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: record.currency,
            maximumFractionDigits: 0,
          }).format(balance)
        } catch {
          return balance.toLocaleString()
        }
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: () => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined />} disabled />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>계좌 목록</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          계좌 등록
        </Button>
      </div>
      <Table<Account>
        columns={columns}
        dataSource={accounts}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: '등록된 계좌가 없습니다.' }}
      />
    </div>
  )
}

export default AccountsPage
