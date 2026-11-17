// 막대 한 칸(한 달 또는 한 해). 금액은 모두 세후 원화.
export interface DividendBarPoint {
  // 월별이면 'YYYY-MM', 연도별이면 'YYYY'
  period: string
  domestic: number
  overseas: number
  // 해외 배당 원본(달러)
  overseasUsd: number
  // domestic + overseas 중 추정분
  estimated: number
}

export type DividendSeriesKey = 'domestic' | 'overseas'

export interface DividendSeries {
  key: DividendSeriesKey
  label: string
  color: string
}

// 쌓는 순서(아래 → 위). 범례·툴팁도 이 순서를 따른다.
export const DIVIDEND_SERIES: DividendSeries[] = [
  { key: 'domestic', label: '국내 배당', color: 'var(--accent)' },
  { key: 'overseas', label: '해외 배당', color: 'var(--emerald)' },
]

export const totalOf = (p: DividendBarPoint): number => p.domestic + p.overseas
