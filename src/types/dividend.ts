// 백엔드(GET /api/v1/dividends/monthly-trend)의 월별 배당 수령 한 점.
// 금액은 모두 세후(배당금 − 원천징수세)이며 Decimal 문자열이다.
export interface MonthlyDividendResponse {
  // 수령 월(YYYY-MM)
  month: string
  // 국내(원화) 배당, 원
  domestic: string
  // 해외(달러) 배당을 수령일 환율로 원화 환산한 값, 원
  overseas: string
  // 해외 배당 원본, 달러
  overseas_usd: string
  // 합계 중 실수령 내역이 아닌 추정분(해외 배당은 일정 × 보유 수량 추정), 원
  estimated: string
  // 국내 + 해외, 원
  total: string
}
