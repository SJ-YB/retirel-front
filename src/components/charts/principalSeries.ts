// 차트 한 점. 금액은 모두 원화 누계.
export interface PrincipalChartPoint {
  date: string
  stock: number
  savings: number
  housing: number
}

export type PrincipalSeriesKey = 'stock' | 'savings' | 'housing'

export interface PrincipalSeries {
  key: PrincipalSeriesKey
  label: string
  color: string
}

// 쌓는 순서(아래 → 위). 범례·툴팁도 이 순서를 따른다.
export const PRINCIPAL_SERIES: PrincipalSeries[] = [
  { key: 'stock', label: '주식 매수금액', color: '#F5C26B' },
  { key: 'savings', label: '예적금 납입원금', color: '#7CB8F5' },
  { key: 'housing', label: '주택청약 납입금', color: '#B89BF0' },
]
