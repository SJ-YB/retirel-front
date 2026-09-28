import type { Currency } from './account'

export interface Holding {
  ticker: string
  name: string
  account: string
  quantity: number
  avgPrice: number
  currentPrice: number
  totalValue: number
  currency: Currency
  trend24: number[]
  returnPct: number
}

export interface AssetsSummary {
  holdingsValue: number
  debtsValue: number
  depositsValue: number
  averageYieldPct: number
  ytdIncome: number
}
