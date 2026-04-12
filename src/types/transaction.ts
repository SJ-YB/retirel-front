export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'DEBT_REPAYMENT'
  | 'DEPOSIT_CHANGE'

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
