import { useEffect, useMemo } from 'react'
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'
import type { InputNumberProps } from 'antd'
import dayjs from 'dayjs'

import type { Account } from '../../types/account'
import type { CreateTransactionRequest, TransactionType } from '../../types/transaction'

const currencyFormatter: InputNumberProps['formatter'] = (value) =>
  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const currencyParser: InputNumberProps['parser'] = (value) =>
  (value?.replace(/,/g, '') ?? '0') as unknown as 0

const TRANSACTION_TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: '외부입금', value: 'DEPOSIT' },
  { label: '출금', value: 'WITHDRAWAL' },
  { label: '주식 매수', value: 'BUY' },
  { label: '주식 매도', value: 'SELL' },
  { label: '배당금', value: 'DIVIDEND' },
  { label: '이자', value: 'INTEREST' },
  { label: '부채상환', value: 'DEBT_REPAYMENT' },
  { label: '보증금변동', value: 'DEPOSIT_CHANGE' },
]

interface TransactionFormModalProps {
  open: boolean
  accounts: Account[]
  onClose: () => void
  onSubmit: (values: CreateTransactionRequest) => Promise<void>
  loading: boolean
}

/** 유형별 표시할 필드 정의 */
const FIELDS_BY_TYPE: Record<TransactionType, string[]> = {
  DEPOSIT: ['accountId', 'amount', 'currency', 'date', 'memo'],
  WITHDRAWAL: ['accountId', 'amount', 'currency', 'date', 'memo'],
  BUY: ['accountId', 'ticker', 'quantity', 'amount', 'date', 'fee', 'memo'],
  SELL: ['accountId', 'ticker', 'quantity', 'amount', 'date', 'fee', 'tax', 'memo'],
  DIVIDEND: ['accountId', 'ticker', 'amount', 'currency', 'date', 'tax', 'memo'],
  INTEREST: ['accountId', 'amount', 'currency', 'date', 'tax', 'memo'],
  DEBT_REPAYMENT: ['accountId', 'principal', 'interest', 'date', 'memo'],
  DEPOSIT_CHANGE: ['accountId', 'amount', 'direction', 'date', 'memo'],
}

function TransactionFormModal({
  open,
  accounts,
  onClose,
  onSubmit,
  loading,
}: TransactionFormModalProps) {
  const [form] = Form.useForm<CreateTransactionRequest>()
  const selectedType: TransactionType | undefined = Form.useWatch('type', form)

  const visibleFields = useMemo(
    () => new Set(selectedType ? FIELDS_BY_TYPE[selectedType] : []),
    [selectedType],
  )

  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, form])

  /** 유형 변경 시 유형·계좌·날짜 외 필드 초기화 */
  const handleTypeChange = () => {
    const RESETTABLE_FIELDS = ['ticker', 'quantity', 'amount', 'currency', 'fee', 'tax', 'memo', 'principal', 'interest', 'direction'] as const
    form.resetFields([...RESETTABLE_FIELDS])
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const payload: CreateTransactionRequest = {
        ...values,
        date: (values.date as unknown as dayjs.Dayjs).format('YYYY-MM-DD'),
      }
      await onSubmit(payload)
    } catch {
      // Ant Design Form이 인라인 에러를 표시하므로 별도 처리 불필요
    }
  }

  const show = (field: string) => visibleFields.has(field)

  return (
    <Modal
      title="거래 등록"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="등록"
      cancelText="취소"
      confirmLoading={loading}
      destroyOnClose
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ currency: 'KRW', direction: 'PAY', date: dayjs() }}
      >
        {/* ── 공통: 거래 유형 ── */}
        <Form.Item
          name="type"
          label="거래 유형"
          rules={[{ required: true, message: '거래 유형을 선택해주세요' }]}
        >
          <Select
            placeholder="거래 유형 선택"
            options={TRANSACTION_TYPE_OPTIONS}
            onChange={handleTypeChange}
          />
        </Form.Item>

        {/* ── 공통: 계좌 ── */}
        {show('accountId') && (
          <Form.Item
            name="accountId"
            label="계좌"
            rules={[{ required: true, message: '계좌를 선택해주세요' }]}
          >
            <Select
              placeholder="계좌 선택"
              options={accounts.map((a) => ({ label: `${a.name} (${a.bank})`, value: a.id }))}
            />
          </Form.Item>
        )}

        {/* ── 공통: 날짜 ── */}
        {show('date') && (
          <Form.Item
            name="date"
            label="거래일"
            rules={[{ required: true, message: '거래일을 선택해주세요' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        )}

        {/* ── 종목 (매수/매도/배당) ── */}
        {show('ticker') && (
          <Form.Item
            name="ticker"
            label="종목"
            rules={[{ required: true, message: '종목명을 입력해주세요' }]}
          >
            <Input placeholder="예: 삼성전자" />
          </Form.Item>
        )}

        {/* ── 수량 (매수/매도) ── */}
        {show('quantity') && (
          <Form.Item
            name="quantity"
            label="수량"
            rules={[{ required: true, message: '수량을 입력해주세요' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
        )}

        {/* ── 금액 ── */}
        {show('amount') && (
          <Form.Item
            name="amount"
            label={selectedType === 'BUY' || selectedType === 'SELL' ? '단가' : '금액'}
            rules={[{ required: true, message: '금액을 입력해주세요' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={currencyFormatter}
              parser={currencyParser}
              placeholder="0"
            />
          </Form.Item>
        )}

        {/* ── 통화 (입금/출금/배당/이자) ── */}
        {show('currency') && (
          <Form.Item
            name="currency"
            label="통화"
            rules={[{ required: true, message: '통화를 선택해주세요' }]}
          >
            <Select>
              <Select.Option value="KRW">KRW (원)</Select.Option>
              <Select.Option value="USD">USD (달러)</Select.Option>
            </Select>
          </Form.Item>
        )}

        {/* ── 원금 (부채상환) ── */}
        {show('principal') && (
          <Form.Item
            name="principal"
            label="원금"
            rules={[{ required: true, message: '원금을 입력해주세요' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={currencyFormatter}
              parser={currencyParser}
              placeholder="0"
            />
          </Form.Item>
        )}

        {/* ── 이자 (부채상환) ── */}
        {show('interest') && (
          <Form.Item
            name="interest"
            label="이자"
            rules={[{ required: true, message: '이자를 입력해주세요' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={currencyFormatter}
              parser={currencyParser}
              placeholder="0"
            />
          </Form.Item>
        )}

        {/* ── 납부/회수 (보증금변동) ── */}
        {show('direction') && (
          <Form.Item
            name="direction"
            label="구분"
            rules={[{ required: true, message: '구분을 선택해주세요' }]}
          >
            <Select>
              <Select.Option value="PAY">납부</Select.Option>
              <Select.Option value="REFUND">회수</Select.Option>
            </Select>
          </Form.Item>
        )}

        {/* ── 수수료 (매수/매도) ── */}
        {show('fee') && (
          <Form.Item name="fee" label="수수료">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={currencyFormatter}
              parser={currencyParser}
              placeholder="0"
            />
          </Form.Item>
        )}

        {/* ── 세금 (매도/배당/이자) ── */}
        {show('tax') && (
          <Form.Item name="tax" label="세금">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={currencyFormatter}
              parser={currencyParser}
              placeholder="0"
            />
          </Form.Item>
        )}

        {/* ── 메모 ── */}
        {show('memo') && (
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} placeholder="메모 (선택)" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default TransactionFormModal
