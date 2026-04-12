import { useEffect } from 'react'
import { Form, Input, Modal, Select } from 'antd'

import type { Account, CreateAccountRequest } from '../../types/account'

interface AccountFormModalProps {
  open: boolean
  account: Account | null
  onClose: () => void
  onSubmit: (values: CreateAccountRequest) => Promise<void>
  loading: boolean
}

function AccountFormModal({
  open,
  account,
  onClose,
  onSubmit,
  loading,
}: AccountFormModalProps) {
  const [form] = Form.useForm<CreateAccountRequest>()
  const isEdit = !!account

  useEffect(() => {
    if (open && account) {
      form.setFieldsValue({
        name: account.name,
        bank: account.bank,
        accountNumber: account.accountNumber,
        currency: account.currency,
        ownerName: account.ownerName,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, account, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
    } catch {
      // Ant Design Form이 인라인 에러를 표시하므로 별도 처리 불필요
    }
  }

  return (
    <Modal
      title={isEdit ? '계좌 수정' : '계좌 등록'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? '수정' : '등록'}
      cancelText="취소"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ currency: 'KRW' }}
      >
        <Form.Item
          name="name"
          label="별칭"
          rules={[{ required: true, message: '별칭을 입력해주세요' }]}
        >
          <Input placeholder="예: 주거래 계좌" />
        </Form.Item>

        <Form.Item
          name="bank"
          label="금융기관명"
          rules={[{ required: true, message: '금융기관명을 입력해주세요' }]}
        >
          <Input placeholder="예: 국민은행" disabled={isEdit} />
        </Form.Item>

        <Form.Item name="accountNumber" label="계좌번호">
          <Input placeholder="예: 123-456-789012" disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="currency"
          label="기본 통화"
          rules={[{ required: true, message: '통화를 선택해주세요' }]}
        >
          <Select disabled={isEdit}>
            <Select.Option value="KRW">KRW (원)</Select.Option>
            <Select.Option value="USD">USD (달러)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="ownerName"
          label="소유자명"
          rules={[{ required: true, message: '소유자명을 입력해주세요' }]}
        >
          <Input placeholder="예: 홍길동" disabled={isEdit} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AccountFormModal
