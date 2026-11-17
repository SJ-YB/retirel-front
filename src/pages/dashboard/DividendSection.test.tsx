import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DividendSection from './DividendSection'
import { apiClient } from '../../api'
import type { MonthlyDividendResponse } from '../../types/dividend'

vi.mock('../../api', () => ({
  apiClient: { get: vi.fn() },
}))

// recharts는 jsdom에서 그려지지 않으므로 받은 막대의 기간만 드러내는 스텁으로 바꾼다.
vi.mock('../../components/charts/DividendBars', () => ({
  default: ({ points }: { points: { period: string }[] }) => (
    <div data-testid="dividend-bars">
      {points.map((p) => p.period).join(',')}
    </div>
  ),
}))

const mockedGet = vi.mocked(apiClient.get)

function month(
  value: string,
  domestic: string,
  overseas = '0',
  estimated = '0',
): MonthlyDividendResponse {
  return {
    month: value,
    domestic,
    overseas,
    overseas_usd: '0',
    estimated,
    total: String(Number(domestic) + Number(overseas)),
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DividendSection', () => {
  it('전체 이력을 읽어 요약과 월별 막대를 보여준다', async () => {
    mockedGet.mockResolvedValue({
      data: [
        month('2025-11', '1000'),
        month('2025-12', '0', '5000', '5000'),
        month('2026-01', '2000'),
        month('2026-02', '0'),
      ],
    })

    render(<DividendSection isMobile={false} />)

    expect(await screen.findByTestId('dividend-bars')).toHaveTextContent(
      '2025-11,2025-12,2026-01,2026-02',
    )
    expect(mockedGet).toHaveBeenCalledWith('/v1/dividends/monthly-trend')
    expect(
      within(screen.getByTestId('dividend-ytd')).getByText('2,000원'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('dividend-last12')).getByText('8,000원'),
    ).toBeInTheDocument()
    expect(screen.getByText(/보유 수량 추정치/)).toBeInTheDocument()
  })

  it('연도별로 바꾸면 해마다 합친 막대를 그린다', async () => {
    mockedGet.mockResolvedValue({
      data: [month('2025-12', '1000'), month('2026-01', '2000')],
    })
    render(<DividendSection isMobile={false} />)
    await screen.findByTestId('dividend-bars')

    await userEvent.click(screen.getByRole('button', { name: '연도별' }))

    expect(screen.getByTestId('dividend-bars')).toHaveTextContent('2025,2026')
  })

  it('월별 보기는 최근 24개월만 그린다', async () => {
    const data = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2024, i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return month(value, '100')
    })
    mockedGet.mockResolvedValue({ data })

    render(<DividendSection isMobile={false} />)

    const bars = await screen.findByTestId('dividend-bars')
    expect(bars.textContent?.split(',')).toHaveLength(24)
    expect(bars.textContent?.startsWith('2024-07')).toBe(true)
  })

  it('불러오지 못하면 안내한다', async () => {
    mockedGet.mockRejectedValue(new Error('down'))

    render(<DividendSection isMobile={false} />)

    expect(
      await screen.findByText('배당 추이를 불러오지 못했습니다.'),
    ).toBeInTheDocument()
  })
})
