import { useEffect } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm } from 'antd'

import type {
  RentalDepositFormValues,
  RentalDepositResponse,
} from '../../types/rentalDeposit'

interface RentalDepositFormModalProps {
  open: boolean
  deposit: RentalDepositResponse | null
  onClose: () => void
  onSubmit: (values: RentalDepositFormValues) => Promise<void>
  onDelete?: () => Promise<void>
  loading: boolean
  deleting?: boolean
}

/**
 * 임대 보증금 등록·수정 모달. 자산 화면 임대 보증금 탭에서 연다.
 *
 * 별칭·보증금·만기일만 받는다. 값 검증(보증금 양수)은 백엔드가 최종 판단하지만,
 * 같은 규칙을 폼에도 걸어 명백한 오입력은 요청 전에 막는다.
 */
function RentalDepositFormModal({
  open,
  deposit,
  onClose,
  onSubmit,
  onDelete,
  loading,
  deleting = false,
}: RentalDepositFormModalProps) {
  const [form] = Form.useForm<RentalDepositFormValues>()
  const isEdit = !!deposit

  useEffect(() => {
    if (open && deposit) {
      form.setFieldsValue({
        alias: deposit.alias,
        amount: Number(deposit.amount),
        maturity_date: deposit.maturity_date,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, deposit, form])

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
      title={isEdit ? '임대 보증금 수정' : '임대 보증금 등록'}
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
                  title="임대 보증금 삭제"
                  description="이 보증금을 삭제하시겠습니까?"
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
      <Form form={form} layout="vertical">
        <Form.Item
          name="alias"
          label="별칭"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '별칭을 입력해주세요',
            },
          ]}
        >
          <Input placeholder="예: 마포 전세" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="보증금"
          rules={[
            { required: true, message: '보증금을 입력해주세요' },
            {
              type: 'number',
              min: 1,
              message: '보증금은 0보다 커야 합니다',
            },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            min={0}
            step={1000000}
            formatter={(value) =>
              `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }
            parser={(value) => Number((value ?? '').replace(/,/g, ''))}
            addonAfter="원"
          />
        </Form.Item>

        <Form.Item
          name="maturity_date"
          label="만기일"
          rules={[{ required: true, message: '만기일을 입력해주세요' }]}
        >
          {/* 네이티브 date 입력. 모바일 키패드·달력을 그대로 쓰고 값은 YYYY-MM-DD다. */}
          <Input type="date" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RentalDepositFormModal
