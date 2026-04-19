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

export interface Debt {
  id: string
  name: string
  bank: string
  currency: Currency
  amount: number
  rate: number
  rateType: '고정' | '변동'
  monthlyPayment: number
  maturity: string
  progressPct: number
}

export interface Deposit {
  id: string
  property: string
  address: string
  currency: Currency
  amount: number
  note: string
  contractType: '전세' | '반전세' | '월세'
  maturity: string
}

export interface AssetsSummary {
  holdingsValue: number
  debtsValue: number
  depositsValue: number
  averageYieldPct: number
  ytdIncome: number
}
