import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AllocationCard from './AllocationCard'
import type { AllocationResponse } from '../../types/networth'

vi.mock('../../components/charts/AllocationDonut', () => ({
  default: ({ total }: { total: string }) => (
    <div data-testid="donut">{total}</div>
  ),
}))

afterEach(() => cleanup())

const data: AllocationResponse = {
  as_of: '2026-11-20',
  usdkrw: '1400',
  total_krw: '2000000',
  classes: [
    { asset_class: 'stock', value_krw: '1700000' },
    { asset_class: 'bond', value_krw: '300000' },
  ],
  holdings: [],
  unpriced_tickers: ['XYZ'],
}

describe('AllocationCard', () => {
  it('자산군별 비중과 총액, 평가하지 못한 종목을 보여준다', () => {
    render(<AllocationCard allocation={data} loading={false} />)

    expect(screen.getByTestId('donut')).toHaveTextContent('₩ 2.0M')
    expect(
      within(screen.getByTestId('allocation-stock')).getByText('85.0%'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('allocation-bond')).getByText('15.0%'),
    ).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('XYZ')
  })

  it('불러오는 중이면 안내한다', () => {
    render(<AllocationCard allocation={null} loading />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })
})
