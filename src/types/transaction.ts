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

export interface MoneyApiResponse {
  currency: string
  amount: string
}

export interface AccountRefApiResponse {
  bank: string
  number: string
}

// 백엔드(GET /api/v1/transactions)가 반환하는 거래내역 응답 본문.
export interface TransactionApiResponse {
  id: string
  account: AccountRefApiResponse
  type: string
  traded_at: string
  amount: MoneyApiResponse
  ticker: string | null
  quantity: string | null
  fee: MoneyApiResponse | null
  tax: MoneyApiResponse | null
}

// 거래내역 동기화 상태. idle: 이력 없음, running: 진행 중,
// succeeded/failed: 마지막 동기화 결과.
export type SyncState = 'idle' | 'running' | 'succeeded' | 'failed'

// 백엔드(POST/GET /api/v1/accounts/{bank}/{number}/transactions/sync) 응답 본문.
export interface SyncStatusResponse {
  bank: string
  number: string
  state: SyncState
  last_synced_at: string | null
  last_error: string | null
  started_at: string | null
  finished_at: string | null
  fetched: number | null
  inserted: number | null
}
