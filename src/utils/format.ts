import type { Currency } from '../types/account'

const safeRound = (n: number): number => (Number.isFinite(n) ? Math.round(n) : 0)

export const fmt = {
  krw: (n: number): string => `₩ ${safeRound(n).toLocaleString('en-US')}`,

  krwShort: (n: number): string => {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}₩ ${(abs / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}₩ ${(abs / 1e6).toFixed(1)}M`
    if (abs >= 1e3) return `${sign}₩ ${(abs / 1e3).toFixed(0)}K`
    return `${sign}₩ ${abs.toLocaleString()}`
  },

  usd: (n: number): string => `$ ${safeRound(n).toLocaleString('en-US')}`,

  usd2: (n: number): string =>
    `$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

  usdShort: (n: number): string => {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    if (abs >= 1e6) return `${sign}$ ${(abs / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$ ${(abs / 1e3).toFixed(1)}K`
    return `${sign}$ ${abs.toLocaleString()}`
  },

  won: (n: number): string => `${safeRound(n).toLocaleString('en-US')}원`,

  pct: (n: number, signed = true): string =>
    `${signed && n >= 0 ? '+' : ''}${n.toFixed(2)}%`,

  money: (n: number, ccy: Currency): string =>
    ccy === 'USD' ? fmt.usd2(n) : fmt.won(n),

  moneyShort: (n: number, ccy: Currency): string =>
    ccy === 'USD' ? fmt.usdShort(n) : fmt.krwShort(n),

  dayLabel: (iso: string): string => {
    const d = new Date(iso + 'T00:00:00')
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const weekday = weekdays[d.getDay()]
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${weekday} · ${m}월 ${day}일`
  },
}

export const USD_KRW_FALLBACK = 1364.2

export function toKrw(value: number, currency: Currency, rate: number = USD_KRW_FALLBACK): number {
  return currency === 'USD' ? value * rate : value
}
