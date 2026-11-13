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
  name?: string
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
  // 실수령 내역이 아니라 배당 일정과 보유 수량으로 추정한 거래인지.
  estimated?: boolean
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
  name: string | null
  quantity: string | null
  fee: MoneyApiResponse | null
  tax: MoneyApiResponse | null
  // 사용자가 직접 입력한 거래인지. 수기 거래만 개별 삭제할 수 있다.
  manual: boolean
  // 실수령 내역이 아니라 추정한 거래인지(해외주식 배당). 구버전 서버는 주지 않는다.
  estimated?: boolean
}

// 백엔드(POST /api/v1/accounts/{bank}/{number}/deposits) 요청 본문.
export interface ManualDepositApiRequest {
  deposited_on: string // YYYY-MM-DD
  amount: string // 원화 금액(10진 문자열)
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

// 백엔드(POST /api/v1/accounts/{bank}/{number}/stock-entries) 요청 본문.
// 공모주 배정·앱 이전 보유분·이체처럼 체결내역에 없는 주식 입출고.
export interface ManualStockEntryApiRequest {
  occurred_on: string // YYYY-MM-DD
  ticker: string
  quantity: string // 주 수(10진 문자열, 양수)
  unit_price: string // 주당 취득가(10진 문자열, 무상이면 0)
  currency: 'krw' | 'usd'
  side: 'buy' | 'sell' // buy: 입고, sell: 출고
}
