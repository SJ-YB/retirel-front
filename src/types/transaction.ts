export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'DEBT_REPAYMENT'
  | 'DEPOSIT_CHANGE'
  | 'SHORT'

export type TransactionKind =
  | '매수'
  | '매도'
  | '배당금'
  | '이자'
  | '외부입금'
  | '출금'
  | '숏'
  | '부채'
  | '보증금'

export type TransactionSign = '+' | '-'

export interface Transaction {
  id: string
  accountId: string
  date: string
  type: TransactionType
  ticker: string
  quantity: number
  amount: number
  fee: number
  tax: number
  memo: string
  currency?: string
  principal?: number
  interest?: number
  direction?: 'PAY' | 'REFUND'
  kind?: TransactionKind
  sign?: TransactionSign
}

export interface CreateTransactionRequest {
  accountId: string
  date: string
  type: TransactionType
  ticker?: string
  quantity?: number
  amount?: number
  currency?: string
  fee?: number
  tax?: number
  memo?: string
  principal?: number
  interest?: number
  direction?: 'PAY' | 'REFUND'
}
