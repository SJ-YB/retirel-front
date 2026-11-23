import type { MonthlyDividendResponse } from '../../types/dividend'
import type { LoanResponse } from '../../types/loan'
import type { NetWorthPointResponse } from '../../types/networth'
import type { RentalDepositResponse } from '../../types/rentalDeposit'

// 홈 화면 상단 지표(히어로·KPI 카드)를 백엔드 응답에서 계산한다.
// 금액은 모두 Decimal 문자열로 오므로 여기서 Number()로 바꾼다.

export interface Change {
  amount: number
  // 기준값이 0이면 비율을 낼 수 없다.
  pct: number | null
}

function changeOf(from: number, to: number): Change {
  return {
    amount: to - from,
    pct: from !== 0 ? ((to - from) / from) * 100 : null,
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 마지막 점과 그로부터 한 달(30일) 전 점 사이의 변동. 한 달 전 자료가 없으면
 * 가진 것 중 가장 이른 점과 비교하고, 점이 하나뿐이면 null.
 */
export function monthlyChange(
  trend: NetWorthPointResponse[],
  pick: (point: NetWorthPointResponse) => number,
): Change | null {
  if (trend.length < 2) return null
  const latest = trend[trend.length - 1]
  const monthAgo = addDays(latest.date, -30)
  let base = trend[0]
  for (const point of trend) {
    if (point.date > monthAgo) break
    base = point
  }
  return changeOf(pick(base), pick(latest))
}

/** 평가액과 투입 원금(매수원가) 사이의 평가 손익. */
export function unrealizedGain(value: number, principal: number): Change {
  return changeOf(principal, value)
}

export interface DebtSummary {
  total: number
  // 대출금액으로 가중한 평균 금리(연, %). 대출이 없으면 null.
  weightedRatePct: number | null
}

export function summarizeLoans(loans: LoanResponse[]): DebtSummary {
  let total = 0
  let weighted = 0
  for (const loan of loans) {
    const principal = Number(loan.principal)
    total += principal
    weighted += principal * Number(loan.interest_rate)
  }
  return { total, weightedRatePct: total > 0 ? weighted / total : null }
}

export interface DepositSummary {
  total: number
  // 다가오는 만기 가운데 가장 이른 날(YYYY-MM-DD). 모두 지났으면 가장 최근에
  // 지난 만기, 보증금이 없으면 null.
  nextMaturity: string | null
}

export function summarizeDeposits(
  deposits: RentalDepositResponse[],
  today: string,
): DepositSummary {
  const total = deposits.reduce((sum, d) => sum + Number(d.amount), 0)
  const dates = deposits.map((d) => d.maturity_date).sort()
  const upcoming = dates.find((date) => date >= today)
  return {
    total,
    nextMaturity: upcoming ?? dates[dates.length - 1] ?? null,
  }
}

/** 'YYYY-MM-DD'를 카드에 들어갈 짧은 표기('27.08)로 바꾼다. */
export function shortYearMonth(iso: string): string {
  return `'${iso.slice(2, 4)}.${iso.slice(5, 7)}`
}

/** 해당 연도에 받은 세후 배당 합계(원). */
export function dividendsOfYear(
  months: MonthlyDividendResponse[],
  year: number,
): number {
  const prefix = `${year}-`
  return months
    .filter((m) => m.month.startsWith(prefix))
    .reduce((sum, m) => sum + Number(m.total), 0)
}
