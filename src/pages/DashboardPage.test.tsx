import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
vi.mock('../components/charts/DividendBars', () => ({ default: () => null }))
vi.mock('../components/charts/PrincipalChart', () => ({ default: () => null }))

const mockedGet = vi.mocked(apiClient.get)

// 채권 비중 카드의 '자산군 지정하기' 링크가 라우터 컨텍스트를 필요로 한다.
function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}
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

/** URL별로 응답을 갈라 주는 apiClient.get 스텁. extra에 없는 URL은 실패한다. */
function respond(
  trend: NetWorthPointResponse[],
  running = false,
  extra: Record<string, unknown> = {},
) {
  mockedGet.mockImplementation((url: string) => {
    if (url === '/v1/net-worth/trend') {
      return Promise.resolve({ data: trend })
    }
    if (url === '/v1/net-worth/refresh') {
      return Promise.resolve({ data: { running, started: false } })
    }
    if (url in extra) return Promise.resolve({ data: extra[url] })
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

    renderPage()

    expect(await screen.findByText('1,140,000')).toBeInTheDocument()
    expect(screen.getByText(/기준일 2026 09 13 · 2개 계좌/)).toBeInTheDocument()
    // 환율은 평가에 실제로 쓴 그 날의 값을 보여준다.
    expect(screen.getByText('₩ 1400.00')).toBeInTheDocument()
  })

  it('통화를 바꾸면 그 날의 환율로 환산된 달러 순자산을 보여준다', async () => {
    respond([point()])

    renderPage()
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

    renderPage()

    expect(await screen.findByTestId('trend-chart')).toHaveTextContent(
      '3 points KRW',
    )
    expect(screen.getByText('+₩ 200K')).toBeInTheDocument()
    expect(screen.getByText('(+20.00%)')).toBeInTheDocument()
  })

  it('기본 구간(6M)의 시작일을 붙여 추이를 조회한다', async () => {
    respond([point()])

    renderPage()

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

    renderPage()
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

    renderPage()

    expect(
      await screen.findByText(/아직 평가된 순자산이 없습니다/),
    ).toBeInTheDocument()
    // 순자산·지표 자리에 목 값 대신 '—'를 보여준다.
    expect(screen.getAllByText('—').length).toBeGreaterThan(1)
  })

  it('평가 손익·부채·보증금·배당을 실제 응답으로 계산해 보여준다', async () => {
    const year = new Date().getFullYear()
    respond(
      [
        point({
          date: '2026-08-13',
          krw_assets: '800000',
          usd_assets: '100.00',
        }),
        point({
          date: '2026-09-13',
          krw_assets: '1000000',
          usd_assets: '110.00',
          net_worth_krw: '1200000',
        }),
      ],
      false,
      {
        '/v1/net-worth/principal-trend': [
          {
            date: '2026-09-13',
            stock: '1000000',
            savings: '0',
            housing_subscription: '0',
            total: '1000000',
          },
        ],
        '/v1/loans': [
          {
            id: 'l1',
            alias: '주담대',
            principal: '300000000',
            interest_rate: '3.5',
            maturity_date: '2040-01-01',
            created_at: null,
            updated_at: null,
          },
        ],
        '/v1/rental-deposits': [
          {
            id: 'd1',
            alias: '전세',
            amount: '180000000',
            maturity_date: '2099-08-31',
            created_at: null,
            updated_at: null,
          },
        ],
        '/v1/dividends/monthly-trend': [
          {
            month: `${year}-03`,
            domestic: '12345',
            overseas: '0',
            overseas_usd: '0',
            estimated: '0',
            total: '12345',
          },
        ],
      },
    )

    renderPage()

    // 평가액 1,200,000 vs 매수원가 1,000,000
    expect(await screen.findByText('+20.00%')).toBeInTheDocument()
    expect(screen.getByText('+200,000원')).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('/v1/net-worth/principal-trend', {
      params: { start: '2026-09-13', end: '2026-09-13' },
    })
    // 국내 800,000 → 1,000,000 (+25%), 미국 $100 → $110 (+10%)
    expect(screen.getByText('₩ 1.0M')).toBeInTheDocument()
    expect(screen.getByText('▲ +25.00%')).toBeInTheDocument()
    expect(screen.getByText('$ 110')).toBeInTheDocument()
    expect(screen.getByText('▲ +10.00%')).toBeInTheDocument()
    expect(screen.getByText('₩ 300.0M')).toBeInTheDocument()
    expect(screen.getByText('평균 금리 3.50% · 1건')).toBeInTheDocument()
    expect(screen.getByText('₩ 180.0M')).toBeInTheDocument()
    expect(screen.getByText("임대 · 만기 '99.08")).toBeInTheDocument()
    expect(
      screen.getByText(`${year} 배당 · 세후`).nextElementSibling,
    ).toHaveTextContent('12,345원')
  })

  it('새로고침을 누르면 갱신을 요청하고 끝나면 추이를 다시 읽는다', async () => {
    respond([point()])
    mockedPost.mockResolvedValue({ data: { running: true, started: true } })

    renderPage()
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
