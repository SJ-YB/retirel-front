import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import RebalanceSection from './RebalanceSection'
import type { AllocationResponse } from '../../types/networth'

function allocation(
  overrides: Partial<AllocationResponse> = {},
): AllocationResponse {
  return {
    as_of: '2026-11-20',
    usdkrw: '1400',
    total_krw: '10000000',
    classes: [
      { asset_class: 'stock', value_krw: '9000000' },
      { asset_class: 'bond', value_krw: '1000000' },
    ],
    holdings: [
      {
        market: 'krx',
        ticker: '114260',
        name: 'KODEX 국고채3년',
        asset_class: 'bond',
        quantity: '10',
        close: '100000',
        close_date: '2026-11-20',
        currency: 'KRW',
        value_krw: '1000000',
      },
    ],
    unpriced_tickers: [],
    ...overrides,
  }
}

function renderSection(data: AllocationResponse | null) {
  return render(
    <MemoryRouter>
      <RebalanceSection allocation={data} isMobile={false} />
    </MemoryRouter>,
  )
}

// 테스트 환경의 localStorage가 온전하지 않을 수 있어 메모리 구현으로 바꿔 끼운다.
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  }
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RebalanceSection', () => {
  it('기본 목표 15% 대비 현재 채권 비중과 부족액을 보여준다', () => {
    renderSection(allocation())

    const current = screen.getByTestId('rebalance-current')
    expect(within(current).getByText('₩ 1.0M')).toBeInTheDocument()
    expect(within(current).getByText(/10\.0%/)).toBeInTheDocument()
    // 목표 150만 − 보유 100만
    expect(
      within(screen.getByTestId('rebalance-gap')).getByText('채권 ₩ 500K 부족'),
    ).toBeInTheDocument()
    // (100만 + X) / (1,000만 + X) = 15% → X ≈ 58.8만
    expect(
      within(screen.getByTestId('rebalance-reach')).getByText('채권 ₩ 588K'),
    ).toBeInTheDocument()
    expect(screen.getByText('KODEX 국고채3년')).toBeInTheDocument()
  })

  it('적립액을 입력하면 채권/주식 배분과 적립 후 비중을 계산하고 기억한다', async () => {
    const user = userEvent.setup()
    renderSection(allocation())

    await user.type(screen.getByLabelText('이번 달 적립액'), '2000000')

    const plan = screen.getByTestId('rebalance-plan')
    expect(within(plan).getByText('채권 800,000원')).toBeInTheDocument()
    expect(
      within(plan).getByText('주식 등 1,200,000원 → 채권 15.0%'),
    ).toBeInTheDocument()
    expect(localStorage.getItem('retirel.allocation.monthlyContribution')).toBe(
      '2000000',
    )
  })

  it('저장된 목표 비중을 불러온다', () => {
    localStorage.setItem('retirel.allocation.targetBondPct', '20')
    renderSection(allocation())

    expect(
      within(screen.getByTestId('rebalance-gap')).getByText('채권 ₩ 1.0M 부족'),
    ).toBeInTheDocument()
  })

  it('평가된 종목이 없으면 안내한다', () => {
    renderSection(null)

    expect(
      screen.getByText('평가된 보유 종목이 없어 비중을 계산할 수 없습니다.'),
    ).toBeInTheDocument()
  })
})
