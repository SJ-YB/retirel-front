import { useEffect } from 'react'
import { Button, Divider, Form, Input, Modal, Popconfirm, Select } from 'antd'

import type { Account, CreateAccountRequest } from '../../types/account'
import { apiIdentity } from '../../utils/account'
import AccountCredentialSection from './AccountCredentialSection'
import AccountSyncSection from './AccountSyncSection'

interface AccountFormModalProps {
  open: boolean
  account: Account | null
  onClose: () => void
  onSubmit: (values: CreateAccountRequest) => Promise<void>
  onDelete?: () => Promise<void>
  loading: boolean
  deleting?: boolean
}

function AccountFormModal({
  open,
  account,
  onClose,
  onSubmit,
  onDelete,
  loading,
  deleting = false,
}: AccountFormModalProps) {
  const [form] = Form.useForm<CreateAccountRequest>()
  const isEdit = !!account

  useEffect(() => {
    if (open && account) {
      form.setFieldsValue({
        name: account.name,
        bank: account.bank,
        accountNumber: account.accountNumber,
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
      footer={
        isEdit
          ? [
              onDelete ? (
                <Popconfirm
                  key="delete"
                  title="계좌 삭제"
                  description="이 계좌를 삭제하시겠습니까?"
                  okText="삭제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                  onConfirm={onDelete}
                >
                  <Button danger loading={deleting} style={{ float: 'left' }}>
                    삭제
                  </Button>
                </Popconfirm>
              ) : null,
              <Button key="cancel" onClick={onClose}>
                취소
              </Button>,
              <Button
                key="ok"
                type="primary"
                loading={loading}
                onClick={handleOk}
              >
                수정
              </Button>,
            ]
          : undefined
      }
    >
      <Form form={form} layout="vertical" initialValues={{ bank: 'hantu' }}>
        <Form.Item
          name="name"
          label="별칭"
          rules={[{ required: true, message: '별칭을 입력해주세요' }]}
        >
          <Input placeholder="예: 주거래 계좌" />
        </Form.Item>

        <Form.Item
          name="bank"
          label="금융사"
          rules={[{ required: true, message: '금융사를 선택해주세요' }]}
        >
          <Select disabled={isEdit}>
            <Select.Option value="hantu">한국투자증권</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="accountNumber"
          label="계좌번호"
          rules={[{ required: true, message: '계좌번호를 입력해주세요' }]}
        >
          <Input placeholder="예: 123-456-789012" disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="ownerName"
          label="소유자"
          rules={[{ required: true, message: '소유자를 입력해주세요' }]}
        >
          <Input placeholder="예: 홍길동" disabled={isEdit} />
        </Form.Item>
      </Form>

      {/* 자격증명 연동은 계좌가 이미 존재해야 하므로 수정 모드에서만 노출한다. */}
      {isEdit && account && (
        <>
          <Divider />
          <AccountCredentialSection {...apiIdentity(account)} />
        </>
      )}
    </Modal>
  )
}

export default AccountFormModal
