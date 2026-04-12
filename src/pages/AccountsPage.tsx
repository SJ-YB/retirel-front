import { useCallback, useEffect, useState } from 'react'
import { Button, Table, Tag, Typography } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import type { Account, CreateAccountRequest } from '../types/account'
import type { ApiResponse, PaginatedResponse } from '../types/api'
import AccountFormModal from './accounts/AccountFormModal'

const { Title } = Typography

function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useUiStore()

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts')
      setAccounts(data.data)
    } catch {
      showToast({ message: '계좌 목록을 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleCreate = () => {
    setEditingAccount(null)
    setModalOpen(true)
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingAccount(null)
  }

  const handleSubmit = async (values: CreateAccountRequest) => {
    setSubmitting(true)
    try {
      if (editingAccount) {
        await apiClient.put<ApiResponse<Account>>(
          `/accounts/${editingAccount.id}`,
          { name: values.name },
        )
        showToast({ message: '계좌가 수정되었습니다', type: 'success' })
      } else {
        await apiClient.post<ApiResponse<Account>>('/accounts', values)
        showToast({ message: '계좌가 등록되었습니다', type: 'success' })
      }
      handleClose()
      await fetchAccounts()
    } catch {
      showToast({ message: '요청 처리에 실패했습니다', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Account> = [
    {
      title: '별칭',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '금융기관',
      dataIndex: 'bank',
      key: 'bank',
    },
    {
      title: '계좌번호',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      render: (value: string) => value || '-',
    },
    {
      title: '통화',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency: string) => (
        <Tag color={currency === 'KRW' ? 'blue' : 'green'}>{currency}</Tag>
      ),
    },
    {
      title: '소유자',
      dataIndex: 'ownerName',
      key: 'ownerName',
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
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>계좌 목록</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          계좌 등록
        </Button>
      </div>

      <Table<Account>
        columns={columns}
        dataSource={accounts}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: '등록된 계좌가 없습니다' }}
      />

      <AccountFormModal
        open={modalOpen}
        account={editingAccount}
        onClose={handleClose}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </div>
  )
}

export default AccountsPage
