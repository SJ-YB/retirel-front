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
