import { describe, expect, it } from 'vitest'

import { planContribution, toSlices, valueOf } from './allocation'
import type { AllocationResponse } from '../../types/networth'

function allocation(
  overrides: Partial<AllocationResponse> = {},
): AllocationResponse {
  return {
    as_of: '2026-11-20',
    usdkrw: '1400',
    total_krw: '1000000',
    classes: [
      { asset_class: 'stock', value_krw: '900000' },
      { asset_class: 'bond', value_krw: '100000' },
    ],
    holdings: [],
    unpriced_tickers: [],
    ...overrides,
  }
}

describe('toSlices', () => {
  it('자산군별 평가액을 비중(%)으로 바꾼다', () => {
    expect(toSlices(allocation())).toEqual([
      { key: 'stock', label: '주식', pct: 90, color: 'var(--accent)' },
      { key: 'bond', label: '채권', pct: 10, color: 'var(--sky)' },
    ])
  })

  it('총액이 0이면 빈 목록', () => {
    expect(toSlices(allocation({ total_krw: '0', classes: [] }))).toEqual([])
  })
})

describe('valueOf', () => {
  it('없는 자산군은 0', () => {
    expect(valueOf(allocation(), 'bond')).toBe(100000)
    expect(valueOf(allocation(), 'cash')).toBe(0)
  })
})

describe('planContribution', () => {
  it('채권이 부족하면 적립액 중 목표를 채울 만큼을 채권에 배분한다', () => {
    // 총 1,000만 · 채권 100만(10%) · 목표 15% · 적립 200만
    // 적립 후 1,200만의 15% = 180만 → 채권 80만, 나머지 120만
    const plan = planContribution({
      total: 10_000_000,
      bond: 1_000_000,
      targetPct: 15,
      contribution: 2_000_000,
    })
    expect(plan.currentPct).toBeCloseTo(10)
    expect(plan.gap).toBeCloseTo(500_000)
    expect(plan.bondBuy).toBeCloseTo(800_000)
    expect(plan.otherBuy).toBeCloseTo(1_200_000)
    expect(plan.afterPct).toBeCloseTo(15)
    // (100만 + X) / (1,000만 + X) = 15% → X ≈ 588,235
    expect(plan.toReachSide).toBe('bond')
    expect(plan.toReach).toBeCloseTo(588_235.29, 0)
  })

  it('크게 부족하면 적립액 전부를 채권에 넣는다', () => {
    const plan = planContribution({
      total: 10_000_000,
      bond: 0,
      targetPct: 15,
      contribution: 500_000,
    })
    expect(plan.bondBuy).toBe(500_000)
    expect(plan.otherBuy).toBe(0)
    expect(plan.afterPct).toBeCloseTo((500_000 / 10_500_000) * 100)
  })

  it('채권이 넘치면 적립액 전부를 채권 외 자산에 넣는다', () => {
    // 총 1,000만 · 채권 200만(20%) · 목표 15%
    const plan = planContribution({
      total: 10_000_000,
      bond: 2_000_000,
      targetPct: 15,
      contribution: 1_000_000,
    })
    expect(plan.bondBuy).toBe(0)
    expect(plan.otherBuy).toBe(1_000_000)
    expect(plan.gap).toBeCloseTo(-500_000)
    // 200만 / (1,000만 + X) = 15% → X ≈ 3,333,333
    expect(plan.toReachSide).toBe('other')
    expect(plan.toReach).toBeCloseTo(3_333_333.33, 0)
  })

  it('보유 자산이 없으면 목표 비중대로 나눈다', () => {
    const plan = planContribution({
      total: 0,
      bond: 0,
      targetPct: 15,
      contribution: 1_000_000,
    })
    expect(plan.currentPct).toBe(0)
    expect(plan.bondBuy).toBeCloseTo(150_000)
    expect(plan.otherBuy).toBeCloseTo(850_000)
    expect(plan.toReachSide).toBeNull()
  })
})
