import type { AssetClass, Market } from './watchlist'

// 백엔드(GET /api/v1/net-worth/trend)의 일별 순자산 한 점.
// 금액은 Decimal이 문자열로 직렬화된 값이다(JSON number로 바꾸면 자릿수가
// 유실되므로 백엔드가 문자열로 보낸다). 화면에서 Number()로 바꿔 쓴다.
export interface NetWorthPointResponse {
  date: string
  // 원화 표시 자산(국내 주식) 평가액 합, KRW
  krw_assets: string
  // 달러 표시 자산(미국 주식) 평가액 합, USD
  usd_assets: string
  // 이 날 환산에 쓴 USD/KRW 환율
  usdkrw: string
  // 전체를 그 날의 환율로 원화/달러 환산한 순자산
  net_worth_krw: string
  net_worth_usd: string
  // 이 날 자료가 있는 계좌 수(계좌가 중간에 늘면 여기서 드러난다)
  accounts: number
}

// 백엔드(POST/GET /api/v1/net-worth/refresh)의 갱신 상태 응답.
export interface NetWorthRefreshStatusResponse {
  running: boolean
  started: boolean
}

// 백엔드(GET /api/v1/net-worth/principal-trend)의 일별 금융자산 원금 한 점.
// 모두 원화(원 단위) 누계이며 Decimal 문자열이다.
export interface PrincipalPointResponse {
  date: string
  // 주식 매수금액(보유분 매수원가, 이동평균법. 달러 매수는 거래일 환율로 환산)
  stock: string
  // 예적금 납입원금(입금 − 출금 누계)
  savings: string
  // 주택청약 납입금(입금 − 출금 누계)
  housing_subscription: string
  // 세 구분의 합
  total: string
}

// 백엔드(GET /api/v1/net-worth/allocation)의 자산군별 평가액.
// 오늘 기준 보유 수량 × 마지막 종가 × 마지막 환율로 계산한 원화 금액(Decimal 문자열).
export interface AssetClassValueResponse {
  asset_class: AssetClass
  value_krw: string
}

export interface HoldingValueResponse {
  market: Market
  ticker: string
  name: string | null
  asset_class: AssetClass
  quantity: string
  close: string
  close_date: string
  currency: 'KRW' | 'USD'
  value_krw: string
}

export interface AllocationResponse {
  // 평가에 쓴 가장 늦은 종가 일자. 평가한 종목이 없으면 null.
  as_of: string | null
  usdkrw: string | null
  // 평가한 종목의 원화 합(증권 평가액). 비중의 분모다.
  total_krw: string
  classes: AssetClassValueResponse[]
  holdings: HoldingValueResponse[]
  // 보유 중이지만 시세·환율이 없어 비중에서 빠진 종목.
  unpriced_tickers: string[]
}
