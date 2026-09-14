import type { Bank } from './account'

// 한 종목을 어느 계좌에 몇 주 들고 있는지. quantity는 Decimal이 문자열로
// 직렬화된 값이다(해외 주식은 소수점 단위로 거래돼 JSON number로 바꾸면
// 자릿수가 유실된다).
export interface AccountShareCountResponse {
  bank: Bank
  number: string
  quantity: string
}

// 백엔드(GET /api/v1/holdings)가 반환하는 종목별 보유 수량.
// 등록된 계좌의 거래내역을 누적한 결과이며, 수량이 0 이하인 종목은 빠진다.
export interface ShareHoldingResponse {
  ticker: string
  name: string | null
  quantity: string
  // 수량이 마지막으로 바뀐 날(집계를 돌린 날이 아니다).
  as_of: string
  accounts: AccountShareCountResponse[]
}

// 백엔드(POST /api/v1/holdings/aggregate)의 집계 결과 요약.
export interface AggregateResultResponse {
  trades: number
  adjustments: number
  points: number
}

// 액면분할·병합처럼 매매 없이 보유 수량만 바꾸는 사건.
// (ticker, effective_date)로 식별하며, 비율은 '전 몇 주가 후 몇 주가 되는가'로
// 적는다(1:2 액면병합이면 old_shares='2', new_shares='1'). 수량과 마찬가지로
// Decimal이 문자열로 직렬화된 값이다.
export interface ShareAdjustmentResponse {
  ticker: string
  effective_date: string
  old_shares: string
  new_shares: string
  memo: string | null
  created_at: string | null
}
