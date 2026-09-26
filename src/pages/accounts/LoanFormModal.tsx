import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm } from 'antd'

import type { LoanFormValues, LoanResponse } from '../../types/loan'

interface LoanFormModalProps {
  open: boolean
  loan: LoanResponse | null
  onClose: () => void
  onSubmit: (values: LoanFormValues) => Promise<void>
  onDelete?: () => Promise<void>
  loading: boolean
  deleting?: boolean
  // 등록 모드에서 폼 위에 놓을 계좌 종류 전환 UI(일반 계좌 ↔ 대출).
  kindSwitch?: ReactNode
}

/**
 * 대출 등록·수정 모달. 계좌 등록 화면에서 종류를 '대출'로 고르면 열린다.
 *
 * 값 검증(원금 양수, 금리·잔액 0 이상)은 백엔드가 최종 판단하지만, 같은 규칙을
 * 폼에도 걸어 명백한 오입력은 요청 전에 막는다.
 */
function LoanFormModal({
  open,
  loan,
  onClose,
  onSubmit,
  onDelete,
  loading,
  deleting = false,
  kindSwitch,
}: LoanFormModalProps) {
  const [form] = Form.useForm<LoanFormValues>()
  const isEdit = !!loan

  useEffect(() => {
    if (open && loan) {
      form.setFieldsValue({
        alias: loan.alias,
        account: loan.account,
        principal: Number(loan.principal),
        interest_rate: Number(loan.interest_rate),
        balance: Number(loan.balance),
        maturity_date: loan.maturity_date,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, loan, form])

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
      title={isEdit ? '대출 수정' : '대출 등록'}
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
                  title="대출 삭제"
                  description="이 대출을 삭제하시겠습니까?"
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
      {!isEdit && kindSwitch}
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
          <Input placeholder="예: 주택담보대출" />
        </Form.Item>

        <Form.Item
          name="account"
          label="계좌"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '계좌를 입력해주세요',
            },
          ]}
        >
          <Input placeholder="예: 국민은행 123-456-789012" />
        </Form.Item>

        <Form.Item
          name="principal"
          label="원금"
          rules={[
            { required: true, message: '원금을 입력해주세요' },
            {
              type: 'number',
              min: 1,
              message: '원금은 0보다 커야 합니다',
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
          name="interest_rate"
          label="금리 (연, %)"
          rules={[
            { required: true, message: '금리를 입력해주세요' },
            { type: 'number', min: 0, message: '금리는 0 이상이어야 합니다' },
          ]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            min={0}
            step={0.1}
            precision={3}
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item
          name="balance"
          label="잔액"
          rules={[
            { required: true, message: '잔액을 입력해주세요' },
            { type: 'number', min: 0, message: '잔액은 0 이상이어야 합니다' },
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

export default LoanFormModal
