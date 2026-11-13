import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PrincipalSection from './PrincipalSection'
import { apiClient } from '../../api'
import type { PrincipalPointResponse } from '../../types/networth'

vi.mock('../../api', () => ({
  apiClient: { get: vi.fn() },
}))

// recharts는 jsdom에서 그려지지 않으므로 받은 점 개수만 드러내는 스텁으로 바꾼다.
vi.mock('../../components/charts/PrincipalChart', () => ({
  default: ({ points }: { points: unknown[] }) => (
    <div data-testid="principal-chart">{points.length} points</div>
  ),
}))

const mockedGet = vi.mocked(apiClient.get)

function point(
  overrides: Partial<PrincipalPointResponse> = {},
): PrincipalPointResponse {
  return {
    date: '2026-09-01',
    stock: '0',
    savings: '0',
    housing_subscription: '0',
    total: '0',
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PrincipalSection', () => {
  it('구분별 최신 원금과 합계, 구간 변동을 보여준다', async () => {
    mockedGet.mockResolvedValue({
      data: [
        point({ date: '2026-09-01', stock: '1000000', savings: '500000' }),
        point({
          date: '2026-09-02',
          stock: '3000000',
          savings: '500000',
          housing_subscription: '20000',
        }),
      ],
    })

    render(
      <PrincipalSection start="2026-09-01" rangeLabel="1M" isMobile={false} />,
    )

    expect(await screen.findByTestId('principal-chart')).toHaveTextContent(
      '2 points',
    )
    expect(mockedGet).toHaveBeenCalledWith('/v1/net-worth/principal-trend', {
      params: { start: '2026-09-01' },
    })
    expect(screen.getByText('3,520,000원')).toBeInTheDocument()

    const stock = screen.getByTestId('principal-stock')
    expect(within(stock).getByText('주식 매수금액')).toBeInTheDocument()
    expect(within(stock).getByText('3,000,000원')).toBeInTheDocument()
    expect(within(stock).getByText('+₩ 2.0M')).toBeInTheDocument()

    const savings = screen.getByTestId('principal-savings')
    expect(within(savings).getByText('500,000원')).toBeInTheDocument()

    const housing = screen.getByTestId('principal-housing')
    expect(within(housing).getByText('20,000원')).toBeInTheDocument()
  })

  it('전체 기간이면 시작일 없이 조회한다', async () => {
    mockedGet.mockResolvedValue({ data: [] })

    render(<PrincipalSection start={null} rangeLabel="전체" isMobile={false} />)

    expect(
      await screen.findByText(/아직 원금 기록이 없습니다/),
    ).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('/v1/net-worth/principal-trend', {
      params: {},
    })
  })

  it('조회에 실패하면 안내 문구를 보여준다', async () => {
    mockedGet.mockRejectedValue(new Error('network'))

    render(<PrincipalSection start={null} rangeLabel="전체" isMobile />)

    expect(
      await screen.findByText('원금 추이를 불러오지 못했습니다.'),
    ).toBeInTheDocument()
  })
})
