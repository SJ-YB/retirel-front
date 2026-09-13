import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PricesPage from './PricesPage'
import { apiClient } from '../api'
import type {
  DailyCloseSeriesResponse,
  LatestPriceResponse,
} from '../types/price'

vi.mock('../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

// recharts는 jsdom에서 0px 컨테이너 때문에 아무것도 그리지 않는다. 차트 자체는
// 이 테스트의 관심사가 아니므로 전달받은 점 개수만 드러내는 스텁으로 바꾼다.
vi.mock('../components/charts/PriceChart', () => ({
  default: ({ points }: { points: unknown[] }) => (
    <div data-testid="price-chart">{points.length} points</div>
  ),
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)

function latest(
  overrides: Partial<LatestPriceResponse> = {},
): LatestPriceResponse {
  return {
    market: 'nas',
    ticker: 'NVDA',
    name: '엔비디아',
    currency: 'USD',
    date: '2026-09-11',
    close: '180.25',
    previous_close: '178.10',
    ...overrides,
  }
}

function series(
  overrides: Partial<DailyCloseSeriesResponse> = {},
): DailyCloseSeriesResponse {
  return {
    market: 'nas',
    ticker: 'NVDA',
    currency: 'USD',
    points: [
      { date: '2026-09-10', close: '178.10' },
      { date: '2026-09-11', close: '180.25' },
    ],
    ...overrides,
  }
}

/** URL별로 응답을 갈라 주는 apiClient.get 스텁. */
function respond(
  latestRows: LatestPriceResponse[],
  seriesData: DailyCloseSeriesResponse | null = series(),
) {
  mockedGet.mockImplementation((url: string) => {
    if (url === '/v1/prices/latest') {
      return Promise.resolve({ data: latestRows })
    }
    if (url === '/v1/prices/collect') {
      return Promise.resolve({ data: { running: false, started: false } })
    }
    return Promise.resolve({ data: seriesData })
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('PricesPage', () => {
  it('관찰 종목의 최신 종가와 전일 대비 등락을 표시한다', async () => {
    respond([latest()])

    render(<PricesPage />)

    expect(await screen.findByText('$ 180.25')).toBeInTheDocument()
    expect(screen.getByText('+1.21%')).toBeInTheDocument()
    expect(screen.getByText('NAS')).toBeInTheDocument()
  })

  it('국내 종목은 원화로 표기한다', async () => {
    respond([
      latest({
        market: 'krx',
        ticker: '005930',
        name: '삼성전자',
        currency: 'KRW',
        close: '71000',
        previous_close: '70500',
      }),
    ])

    render(<PricesPage />)

    expect(await screen.findByText('71,000원')).toBeInTheDocument()
  })

  it('아직 수집되지 않은 종목은 미수집으로 표시한다', async () => {
    respond([latest({ close: null, previous_close: null, date: null })])

    render(<PricesPage />)

    expect(await screen.findByText('미수집')).toBeInTheDocument()
  })

  it('관찰 종목이 없으면 등록을 안내한다', async () => {
    respond([])

    render(<PricesPage />)

    expect(await screen.findByText(/관찰 종목이 없습니다/)).toBeInTheDocument()
  })

  it('첫 종목을 자동으로 선택해 시계열을 불러온다', async () => {
    respond([latest()])

    render(<PricesPage />)

    expect(await screen.findByTestId('price-chart')).toHaveTextContent(
      '2 points',
    )
    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        '/v1/prices/nas/NVDA',
        expect.objectContaining({
          params: expect.objectContaining({ start: expect.any(String) }),
        }),
      ),
    )
  })

  it('다른 종목을 고르면 그 종목의 시계열을 불러온다', async () => {
    respond([latest(), latest({ ticker: 'AAPL', name: '애플' })])

    render(<PricesPage />)
    await screen.findByTestId('price-chart')

    await userEvent.click(screen.getByText('애플'))

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        '/v1/prices/nas/AAPL',
        expect.anything(),
      ),
    )
  })

  it('ALL 구간을 고르면 시작일 없이 전체를 요청한다', async () => {
    respond([latest()])

    render(<PricesPage />)
    await screen.findByTestId('price-chart')

    await userEvent.click(screen.getByRole('button', { name: 'ALL' }))

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith('/v1/prices/nas/NVDA', {
        params: {},
      }),
    )
  })

  it('적재된 종가가 없으면 수집을 먼저 실행하라고 안내한다', async () => {
    respond([latest()], series({ points: [] }))

    render(<PricesPage />)

    expect(
      await screen.findByText(/적재된 종가가 없습니다/),
    ).toBeInTheDocument()
  })

  it('수집이 끝나면 최신 종가를 다시 읽는다', async () => {
    // shouldAdvanceTime을 켜야 userEvent·waitFor가 쓰는 대기가 가짜 타이머에
    // 멈춰 서지 않는다(폴링 주기만 직접 앞당긴다).
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      respond([latest()])
      mockedPost.mockResolvedValue({ data: { running: true, started: true } })

      render(<PricesPage />)
      await vi.waitFor(() => screen.getByTestId('price-chart'))
      const listCallsBefore = mockedGet.mock.calls.filter(
        ([url]) => url === '/v1/prices/latest',
      ).length

      await user.click(screen.getByRole('button', { name: /수집/ }))
      await vi.waitFor(() =>
        expect(mockedPost).toHaveBeenCalledWith('/v1/prices/collect'),
      )
      expect(showToast).toHaveBeenCalledWith({
        message: '종가 수집을 시작했습니다',
        type: 'info',
      })

      // 폴링 주기가 지나면 상태를 확인하고, 끝났으면 목록을 다시 읽는다.
      await vi.advanceTimersByTimeAsync(3500)

      expect(mockedGet).toHaveBeenCalledWith('/v1/prices/collect')
      await vi.waitFor(() =>
        expect(
          mockedGet.mock.calls.filter(([url]) => url === '/v1/prices/latest')
            .length,
        ).toBeGreaterThan(listCallsBefore),
      )
    } finally {
      // 가짜 타이머가 걸린 동안 언마운트해야, 남은 폴링 타이머가 다음 테스트로
      // 새지 않는다.
      cleanup()
      vi.useRealTimers()
    }
  })

  it('이미 수집 중이면 그렇게 안내한다', async () => {
    const user = userEvent.setup()
    respond([latest()])
    mockedPost.mockResolvedValue({ data: { running: true, started: false } })

    render(<PricesPage />)
    await screen.findByTestId('price-chart')

    await user.click(screen.getByRole('button', { name: /수집/ }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '이미 수집이 진행 중입니다',
        type: 'info',
      }),
    )
  })

  it('목록 조회가 실패하면 오류를 안내한다', async () => {
    mockedGet.mockRejectedValue(new Error('boom'))

    render(<PricesPage />)

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '종가를 불러오지 못했습니다',
        type: 'error',
      }),
    )
  })
})
