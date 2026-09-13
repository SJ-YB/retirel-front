import type { Market } from './watchlist'

// 백엔드가 시장에서 파생해 내려주는 표기 통화.
export type PriceCurrency = 'KRW' | 'USD'

// 종가 시계열의 한 점. close는 Decimal이 문자열로 직렬화된 값이다
// (JSON number로 바꾸면 소수 자릿수가 유실되므로 백엔드가 문자열로 보낸다).
export interface DailyClosePointResponse {
  date: string
  close: string
}

// 백엔드(GET /api/v1/prices/{market}/{ticker})의 종가 시계열 응답.
export interface DailyCloseSeriesResponse {
  market: Market
  ticker: string
  currency: PriceCurrency
  points: DailyClosePointResponse[]
}

// 백엔드(GET /api/v1/prices/latest)의 관찰 종목별 최신 종가 응답.
// 아직 수집되지 않은 종목은 date/close/previous_close가 모두 null이다.
export interface LatestPriceResponse {
  market: Market
  ticker: string
  name: string | null
  currency: PriceCurrency
  date: string | null
  close: string | null
  previous_close: string | null
}

// 백엔드(GET/POST /api/v1/prices/collect)의 수집 상태 응답.
export interface CollectStatusResponse {
  running: boolean
  started: boolean
}
