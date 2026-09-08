// 관찰 종목이 상장된 시장. 백엔드 Market enum과 같은 문자열을 사용한다.
// 해외는 심볼만으로 종목이 특정되지 않아 거래소를 함께 식별자로 쓴다.
export type Market = 'krx' | 'nas' | 'nys' | 'ams'

// 백엔드(GET/POST /api/v1/watchlist)가 반환하는 관찰 종목 응답 본문.
export interface WatchedStockResponse {
  market: Market
  ticker: string
  name: string | null
  created_at: string | null
}

// 백엔드(POST /api/v1/watchlist)가 기대하는 관찰 종목 등록 요청 본문.
export interface AddWatchedStockRequest {
  market: Market
  ticker: string
  name?: string
}
