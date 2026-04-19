import { describe, expect, it } from 'vitest'

import { fmt, toKrw, USD_KRW_FALLBACK } from './format'

describe('fmt.krw', () => {
  it('prefixes ₩ and inserts thousand separators', () => {
    expect(fmt.krw(1_847_293_508)).toBe('₩ 1,847,293,508')
  })

  it('rounds to integer', () => {
    expect(fmt.krw(1234.7)).toBe('₩ 1,235')
  })

  it('handles zero', () => {
    expect(fmt.krw(0)).toBe('₩ 0')
  })

  it('falls back to 0 for non-finite input', () => {
    expect(fmt.krw(Number.NaN)).toBe('₩ 0')
    expect(fmt.krw(Number.POSITIVE_INFINITY)).toBe('₩ 0')
  })
})

describe('fmt.krwShort', () => {
  it('formats billions with 2 decimals + B suffix', () => {
    expect(fmt.krwShort(1_847_293_508)).toBe('₩ 1.85B')
  })

  it('formats millions with 1 decimal + M suffix', () => {
    expect(fmt.krwShort(12_480_000)).toBe('₩ 12.5M')
  })

  it('formats thousands with K suffix', () => {
    expect(fmt.krwShort(482_000)).toBe('₩ 482K')
  })

  it('keeps sign for negative values', () => {
    expect(fmt.krwShort(-240_000_000)).toBe('-₩ 240.0M')
  })

  it('handles small numbers under 1000', () => {
    expect(fmt.krwShort(150)).toBe('₩ 150')
  })
})

describe('fmt.usd / fmt.usd2 / fmt.usdShort', () => {
  it('fmt.usd formats integer dollars', () => {
    expect(fmt.usd(684_210)).toBe('$ 684,210')
  })

  it('fmt.usd2 keeps 2 decimals', () => {
    expect(fmt.usd2(928.55)).toBe('$ 928.55')
  })

  it('fmt.usdShort compresses to M/K', () => {
    expect(fmt.usdShort(1_250_000)).toBe('$ 1.25M')
    expect(fmt.usdShort(7428.4)).toBe('$ 7.4K')
    expect(fmt.usdShort(-500_000)).toBe('-$ 500.0K')
  })
})

describe('fmt.won', () => {
  it('appends 원 suffix with thousand separators', () => {
    expect(fmt.won(62_480_000)).toBe('62,480,000원')
  })
})

describe('fmt.pct', () => {
  it('adds + sign for positive when signed=true (default)', () => {
    expect(fmt.pct(24.82)).toBe('+24.82%')
  })

  it('omits + sign for positive when signed=false', () => {
    expect(fmt.pct(24.82, false)).toBe('24.82%')
  })

  it('always shows minus sign for negative', () => {
    expect(fmt.pct(-12.3)).toBe('-12.30%')
    expect(fmt.pct(-12.3, false)).toBe('-12.30%')
  })
})

describe('fmt.money / fmt.moneyShort', () => {
  it('money dispatches by currency', () => {
    expect(fmt.money(8_400_000, 'KRW')).toBe('8,400,000원')
    expect(fmt.money(928.55, 'USD')).toBe('$ 928.55')
  })

  it('moneyShort dispatches by currency', () => {
    expect(fmt.moneyShort(1_847_293_508, 'KRW')).toBe('₩ 1.85B')
    expect(fmt.moneyShort(1_250_000, 'USD')).toBe('$ 1.25M')
  })
})

describe('fmt.dayLabel', () => {
  it('renders weekday and Korean month-day label', () => {
    expect(fmt.dayLabel('2026-04-17')).toBe('Friday · 4월 17일')
    expect(fmt.dayLabel('2026-04-12')).toBe('Sunday · 4월 12일')
  })
})

describe('toKrw', () => {
  it('returns KRW balance unchanged', () => {
    expect(toKrw(1_000_000, 'KRW')).toBe(1_000_000)
  })

  it('converts USD to KRW using fallback rate', () => {
    expect(toKrw(100, 'USD')).toBeCloseTo(100 * USD_KRW_FALLBACK)
  })

  it('accepts custom rate override', () => {
    expect(toKrw(100, 'USD', 1400)).toBe(140_000)
  })
})
