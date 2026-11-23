import { describe, expect, it } from 'vitest'

import {
  dividendsOfYear,
  monthlyChange,
  shortYearMonth,
  summarizeDeposits,
  summarizeLoans,
  unrealizedGain,
} from './summary'
import type { LoanResponse } from '../../types/loan'
import type { MonthlyDividendResponse } from '../../types/dividend'
import type { NetWorthPointResponse } from '../../types/networth'
import type { RentalDepositResponse } from '../../types/rentalDeposit'

function point(date: string, krw: string): NetWorthPointResponse {
  return {
    date,
    krw_assets: krw,
    usd_assets: '0',
    usdkrw: '1400',
    net_worth_krw: krw,
    net_worth_usd: '0',
    accounts: 1,
  }
}

function loan(principal: string, rate: string): LoanResponse {
  return {
    id: principal,
    alias: '대출',
    principal,
    interest_rate: rate,
    maturity_date: '2030-01-01',
    created_at: null,
    updated_at: null,
  }
}

function deposit(amount: string, maturity: string): RentalDepositResponse {
  return {
    id: maturity,
    alias: '보증금',
    amount,
    maturity_date: maturity,
    created_at: null,
    updated_at: null,
  }
}

function dividend(month: string, total: string): MonthlyDividendResponse {
  return {
    month,
    domestic: total,
    overseas: '0',
    overseas_usd: '0',
    estimated: '0',
    total,
  }
}

const krw = (p: NetWorthPointResponse) => Number(p.krw_assets)

describe('monthlyChange', () => {
  it('마지막 점과 30일 전(또는 그 직전) 점을 비교한다', () => {
    const trend = [
      point('2026-09-01', '800'),
      point('2026-10-13', '1000'),
      point('2026-10-20', '1050'),
      point('2026-11-13', '1100'),
    ]
    expect(monthlyChange(trend, krw)).toEqual({ amount: 100, pct: 10 })
  })

  it('한 달 전 자료가 없으면 가장 이른 점과 비교한다', () => {
    const trend = [point('2026-11-01', '1000'), point('2026-11-13', '1200')]
    expect(monthlyChange(trend, krw)).toEqual({ amount: 200, pct: 20 })
  })

  it('점이 하나뿐이면 null', () => {
    expect(monthlyChange([point('2026-11-13', '1000')], krw)).toBeNull()
  })

  it('기준값이 0이면 비율은 null', () => {
    const trend = [point('2026-11-01', '0'), point('2026-11-13', '500')]
    expect(monthlyChange(trend, krw)).toEqual({ amount: 500, pct: null })
  })
})

describe('unrealizedGain', () => {
  it('평가액 − 원금과 수익률', () => {
    expect(unrealizedGain(1200, 1000)).toEqual({ amount: 200, pct: 20 })
    expect(unrealizedGain(900, 1000)).toEqual({ amount: -100, pct: -10 })
  })
})

describe('summarizeLoans', () => {
  it('대출금액 합계와 금액 가중 평균 금리', () => {
    const result = summarizeLoans([loan('300', '3'), loan('100', '5')])
    expect(result.total).toBe(400)
    expect(result.weightedRatePct).toBeCloseTo(3.5)
  })

  it('대출이 없으면 0원, 금리 null', () => {
    expect(summarizeLoans([])).toEqual({ total: 0, weightedRatePct: null })
  })
})

describe('summarizeDeposits', () => {
  it('합계와 다가오는 가장 이른 만기', () => {
    expect(
      summarizeDeposits(
        [
          deposit('100', '2028-03-01'),
          deposit('200', '2025-01-01'),
          deposit('300', '2027-08-31'),
        ],
        '2026-11-23',
      ),
    ).toEqual({ total: 600, nextMaturity: '2027-08-31' })
  })

  it('모두 지났으면 가장 최근에 지난 만기', () => {
    expect(
      summarizeDeposits(
        [deposit('100', '2025-01-01'), deposit('100', '2026-01-01')],
        '2026-11-23',
      ).nextMaturity,
    ).toBe('2026-01-01')
  })

  it('보증금이 없으면 0원, 만기 null', () => {
    expect(summarizeDeposits([], '2026-11-23')).toEqual({
      total: 0,
      nextMaturity: null,
    })
  })
})

describe('shortYearMonth', () => {
  it("'YY.MM 형식", () => {
    expect(shortYearMonth('2027-08-31')).toBe("'27.08")
  })
})

describe('dividendsOfYear', () => {
  it('해당 연도 월만 더한다', () => {
    expect(
      dividendsOfYear(
        [
          dividend('2025-12', '1000'),
          dividend('2026-01', '200'),
          dividend('2026-04', '300.5'),
        ],
        2026,
      ),
    ).toBeCloseTo(500.5)
  })
})
