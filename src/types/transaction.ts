export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND'

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
}
