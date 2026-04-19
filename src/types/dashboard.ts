import type { Currency } from './account'

export interface DashboardSummary {
  netWorth: number
  currency: Currency
  usdkrw: number
  cumulativeTwr: number
  ytd: number
  monthlyInterest: number
  monthlyPnl: number
  koreanAssets: { value: number; deltaPct: number }
  usAssets: { value: number; deltaPct: number }
  debt: { value: number; ratePct: number }
  deposit: { value: number; nextMaturity: string }
}

export interface NetWorthTrendPoint {
  label: string
  netWorth: number
  deposits: number
}

export interface AllocationSlice {
  key: string
  label: string
  pct: number
  color: string
}

export interface IncomeHistoryPoint {
  month: string
  dividend: number
  interest: number
}
