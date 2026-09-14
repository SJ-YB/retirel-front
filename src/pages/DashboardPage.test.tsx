import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DashboardPage from './DashboardPage'
import { apiClient } from '../api'
import type { NetWorthPointResponse } from '../types/networth'

vi.mock('../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

// recharts는 jsdom에서 0px 컨테이너 때문에 아무것도 그리지 않는다. 차트 자체는
// 이 테스트의 관심사가 아니므로 전달받은 점 개수와 통화만 드러내는 스텁으로 바꾼다.
vi.mock('../components/charts/TrendChart', () => ({
  default: ({ points, currency }: { points: unknown[]; currency: string }) => (
    <div data-testid="trend-chart">
      {points.length} points {currency}
    </div>
  ),
}))
vi.mock('../components/charts/AllocationDonut', () => ({ default: () => null }))
vi.mock('../components/charts/IncomeBars', () => ({ default: () => null }))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)

function point(
  overrides: Partial<NetWorthPointResponse> = {},
): NetWorthPointResponse {
  return {
    date: '2026-09-13',
    krw_assets: '1000000',
    usd_assets: '100.00',
    usdkrw: '1400',
    net_worth_krw: '1140000',
    net_worth_usd: '814.29',
    accounts: 1,
    ...overrides,
  }
}

/** URL별로 응답을 갈라 주는 apiClient.get 스텁. */
function respond(trend: NetWorthPointResponse[], running = false) {
  mockedGet.mockImplementation((url: string) => {
    if (url === '/v1/net-worth/trend') {
      return Promise.resolve({ data: trend })
    }
    if (url === '/v1/net-worth/refresh') {
      return Promise.resolve({ data: { running, started: false } })
    }
    // 대시보드의 나머지 목 데이터(summary/allocation/income)는 그대로 둔다.
    return Promise.reject(new Error('unhandled'))
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('DashboardPage', () => {
  it('마지막 평가 시점의 순자산을 원화로 크게 보여준다', async () => {
    respond([
      point({ date: '2026-09-12', net_worth_krw: '1000000' }),
      point({ date: '2026-09-13', net_worth_krw: '1140000', accounts: 2 }),
    ])

    render(<DashboardPage />)

    expect(await screen.findByText('1,140,000')).toBeInTheDocument()
    expect(screen.getByText(/기준일 2026 09 13 · 2개 계좌/)).toBeInTheDocument()
    // 환율은 평가에 실제로 쓴 그 날의 값을 보여준다.
    expect(screen.getByText('₩ 1400.00')).toBeInTheDocument()
  })

  it('통화를 바꾸면 그 날의 환율로 환산된 달러 순자산을 보여준다', async () => {
    respond([point()])

    render(<DashboardPage />)
    await screen.findByText('1,140,000')

    const [heroToggle] = screen.getAllByRole('button', { name: 'USD' })
    await userEvent.click(heroToggle)

    expect(screen.getByText('814')).toBeInTheDocument()
  })

  it('추이 차트에 구간의 모든 점을 넘기고 구간 변동을 표시한다', async () => {
    respond([
      point({ date: '2026-09-11', net_worth_krw: '1000000' }),
      point({ date: '2026-09-12', net_worth_krw: '1100000' }),
      point({ date: '2026-09-13', net_worth_krw: '1200000' }),
    ])

    render(<DashboardPage />)

    expect(await screen.findByTestId('trend-chart')).toHaveTextContent(
      '3 points KRW',
    )
    expect(screen.getByText('+₩ 200K')).toBeInTheDocument()
    expect(screen.getByText('(+20.00%)')).toBeInTheDocument()
  })

  it('기본 구간(6M)의 시작일을 붙여 추이를 조회한다', async () => {
    respond([point()])

    render(<DashboardPage />)

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        '/v1/net-worth/trend',
        expect.objectContaining({
          params: { start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
        }),
      ),
    )
  })

  it('전체 구간은 시작일 없이 조회한다', async () => {
    respond([point()])

    render(<DashboardPage />)
    await screen.findByText('1,140,000')

    await userEvent.click(screen.getByRole('button', { name: '전체' }))

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith('/v1/net-worth/trend', {
        params: {},
      }),
    )
  })

  it('평가된 순자산이 없으면 안내 문구를 보여준다', async () => {
    respond([])

    render(<DashboardPage />)

    expect(
      await screen.findByText(/아직 평가된 순자산이 없습니다/),
    ).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('새로고침을 누르면 갱신을 요청하고 끝나면 추이를 다시 읽는다', async () => {
    respond([point()])
    mockedPost.mockResolvedValue({ data: { running: true, started: true } })

    render(<DashboardPage />)
    await screen.findByText('1,140,000')
    const trendCallsBefore = mockedGet.mock.calls.filter(
      ([url]) => url === '/v1/net-worth/trend',
    ).length

    await userEvent.click(screen.getByRole('button', { name: '순자산 갱신' }))

    expect(mockedPost).toHaveBeenCalledWith('/v1/net-worth/refresh')
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info' }),
    )
    // 상태 폴링에서 running=false가 오면 추이를 한 번 더 읽는다.
    await waitFor(
      () =>
        expect(
          mockedGet.mock.calls.filter(([url]) => url === '/v1/net-worth/trend')
            .length,
        ).toBeGreaterThan(trendCallsBefore),
      { timeout: 5000 },
    )
  })
})
