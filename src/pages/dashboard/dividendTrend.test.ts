import { describe, expect, it } from 'vitest'

import { summarize, toMonthlyPoint, toYearly } from './dividendTrend'
import type { DividendBarPoint } from '../../components/charts/dividendSeries'

function month(period: string, domestic = 0, overseas = 0): DividendBarPoint {
  return { period, domestic, overseas, overseasUsd: 0, estimated: overseas }
}

describe('toMonthlyPoint', () => {
  it('문자열 금액을 숫자로 바꾼다', () => {
    expect(
      toMonthlyPoint({
        month: '2026-11',
        domestic: '3056',
        overseas: '11900',
        overseas_usd: '8.50',
        estimated: '11900',
        total: '14956',
      }),
    ).toEqual({
      period: '2026-11',
      domestic: 3056,
      overseas: 11900,
      overseasUsd: 8.5,
      estimated: 11900,
    })
  })
})

describe('toYearly', () => {
  it('월별 점을 연도별로 합친다', () => {
    expect(
      toYearly([
        month('2025-11', 100, 10),
        month('2025-12', 200, 20),
        month('2026-01', 300, 30),
      ]),
    ).toEqual([
      {
        period: '2025',
        domestic: 300,
        overseas: 30,
        overseasUsd: 0,
        estimated: 30,
      },
      {
        period: '2026',
        domestic: 300,
        overseas: 30,
        overseasUsd: 0,
        estimated: 30,
      },
    ])
  })
})

describe('summarize', () => {
  it('데이터가 없으면 null', () => {
    expect(summarize([])).toBeNull()
  })

  it('올해 누적을 작년 같은 기간과 비교하고 최근 12개월을 합친다', () => {
    const months = [
      month('2025-01', 100),
      month('2025-02', 100),
      month('2025-03', 1000), // 작년 동기(1~2월) 밖
      ...['04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) =>
        month(`2025-${m}`, 10),
      ),
      month('2026-01', 300, 0),
      month('2026-02', 0, 100),
    ]

    const summary = summarize(months)

    expect(summary?.ytd).toBe(400)
    expect(summary?.ytdChangePct).toBeCloseTo(100)
    // 2025-03 ~ 2026-02
    expect(summary?.last12).toBe(1000 + 90 + 400)
  })

  it('작년 같은 기간 배당이 없으면 증감률은 null', () => {
    expect(summarize([month('2026-01', 100)])?.ytdChangePct).toBeNull()
  })
})
