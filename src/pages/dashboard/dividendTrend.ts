import type { DividendBarPoint } from '../../components/charts/dividendSeries'
import { totalOf } from '../../components/charts/dividendSeries'
import type { MonthlyDividendResponse } from '../../types/dividend'

export function toMonthlyPoint(m: MonthlyDividendResponse): DividendBarPoint {
  return {
    period: m.month,
    domestic: Number(m.domestic),
    overseas: Number(m.overseas),
    overseasUsd: Number(m.overseas_usd),
    estimated: Number(m.estimated),
  }
}

/** 월별 점을 연도별로 합친다(연도 오름차순). */
export function toYearly(months: DividendBarPoint[]): DividendBarPoint[] {
  const years = new Map<string, DividendBarPoint>()
  for (const m of months) {
    const year = m.period.slice(0, 4)
    const acc = years.get(year) ?? {
      period: year,
      domestic: 0,
      overseas: 0,
      overseasUsd: 0,
      estimated: 0,
    }
    acc.domestic += m.domestic
    acc.overseas += m.overseas
    acc.overseasUsd += m.overseasUsd
    acc.estimated += m.estimated
    years.set(year, acc)
  }
  return [...years.values()].sort((a, b) => a.period.localeCompare(b.period))
}

export interface DividendSummary {
  // 올해 1월 ~ 이번 달 합계
  ytd: number
  // 작년 같은 기간(1월 ~ 같은 달) 대비 증감률(%). 작년 같은 기간이 0이면 null.
  ytdChangePct: number | null
  // 이번 달을 포함한 최근 12개월 합계
  last12: number
}

const sum = (points: DividendBarPoint[]) =>
  points.reduce((acc, p) => acc + totalOf(p), 0)

/**
 * 요약 수치. 기준 달은 응답의 마지막 달이다(백엔드가 이번 달까지 0으로 채워 준다).
 */
export function summarize(months: DividendBarPoint[]): DividendSummary | null {
  if (months.length === 0) return null
  const latest = months[months.length - 1].period // YYYY-MM
  const year = Number(latest.slice(0, 4))
  const monthOfYear = latest.slice(5, 7)

  const inRange = (from: string, to: string) =>
    months.filter((m) => m.period >= from && m.period <= to)

  const ytd = sum(inRange(`${year}-01`, latest))
  const lastYtd = sum(inRange(`${year - 1}-01`, `${year - 1}-${monthOfYear}`))

  return {
    ytd,
    ytdChangePct: lastYtd > 0 ? ((ytd - lastYtd) / lastYtd) * 100 : null,
    last12: sum(months.slice(-12)),
  }
}
