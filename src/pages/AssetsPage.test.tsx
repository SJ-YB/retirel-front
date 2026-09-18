import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AssetsPage from './AssetsPage'
import { apiClient } from '../api'
import type {
  ShareAdjustmentResponse,
  ShareHoldingResponse,
} from '../types/holding'

vi.mock('../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

// 화면 폭에 따라 표(데스크톱)와 카드(모바일) 중 하나만 그려지므로, 두 경로를
// 각각 확인할 수 있도록 폭 판정을 테스트가 쥐고 있는다.
const { viewport } = vi.hoisted(() => ({ viewport: { mobile: false } }))
vi.mock('../hooks/useIsMobile', () => ({
  useIsMobile: () => viewport.mobile,
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)

function holding(
  overrides: Partial<ShareHoldingResponse> = {},
): ShareHoldingResponse {
  return {
    ticker: '005930',
    name: '삼성전자',
    quantity: '30',
    as_of: '2026-09-11',
    accounts: [{ bank: 'hantu', number: '12345678-01', quantity: '30' }],
    ...overrides,
  }
}

/** 보유 종목만 응답하고 나머지(부채·보증금)는 실패시켜 mock으로 떨어뜨린다. */
/** 요약 카드 한 장. 라벨은 표 제목 등과 겹칠 수 있어 라벨 스타일로 좁힌다. */
function summaryCard(label: string): HTMLElement {
  return screen
    .getByText(label, { selector: '.label-caps' })
    .closest('.card') as HTMLElement
}

/**
 * 보유 종목 표. 페이지에는 수량 조정 표(antd)도 함께 있어 role 질의만으로는
 * 두 표가 섞인다. 보유 종목 표는 페이지 공용 클래스(.tbl)를 쓴다.
 */
function holdingsTable(): HTMLElement {
  return document.querySelector('table.tbl') as HTMLElement
}

function respond(
  holdings: ShareHoldingResponse[],
  adjustments: ShareAdjustmentResponse[] = [],
) {
  mockedGet.mockImplementation((url: string) => {
    if (url === '/v1/holdings') return Promise.resolve({ data: holdings })
    if (url === '/v1/holdings/adjustments')
      return Promise.resolve({ data: adjustments })
    return Promise.reject(new Error('not implemented'))
  })
}

afterEach(() => {
  viewport.mobile = false
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('AssetsPage', () => {
  it('집계된 종목별 주식 수를 표시한다', async () => {
    respond([holding()])

    render(<AssetsPage />)

    expect(await screen.findByText('삼성전자')).toBeInTheDocument()
    const row = within(holdingsTable()).getAllByRole('row')[1]
    expect(within(row).getByText('005930')).toBeInTheDocument()
    expect(within(row).getByText('30')).toBeInTheDocument()
    expect(within(row).getByText('12345678-01')).toBeInTheDocument()
    expect(within(row).getByText('2026 09 11')).toBeInTheDocument()
  })

  it('소수점 단위 수량을 반올림하지 않는다', async () => {
    respond([holding({ ticker: 'AAPL', name: null, quantity: '0.25' })])

    render(<AssetsPage />)

    expect(await screen.findByText('0.25')).toBeInTheDocument()
  })

  it('여러 계좌에 나눠 들고 있으면 계좌 수로 묶어 보여준다', async () => {
    respond([
      holding({
        quantity: '30',
        accounts: [
          { bank: 'hantu', number: '12345678-01', quantity: '20' },
          { bank: 'hantu', number: '87654321-01', quantity: '10' },
        ],
      }),
    ])

    render(<AssetsPage />)

    expect(await screen.findByText('2개 계좌')).toBeInTheDocument()
  })

  it('종목 행을 클릭하면 계좌별 보유 수량을 펼쳐 보여준다', async () => {
    respond([
      holding({
        quantity: '30',
        accounts: [
          { bank: 'hantu', number: '12345678-01', quantity: '20' },
          { bank: 'hantu', number: '87654321-01', quantity: '10' },
        ],
      }),
    ])

    render(<AssetsPage />)

    await screen.findByText('삼성전자')
    expect(screen.queryByText('12345678-01')).not.toBeInTheDocument()

    await userEvent.click(within(holdingsTable()).getAllByRole('row')[1])

    // 펼친 행 바로 아래에 계좌별 수량이 붙는다. 수량이 많은 계좌가 먼저다.
    const detail = within(holdingsTable()).getAllByRole('row')[2]
    const accounts = within(detail).getAllByText(/^\d{8}-\d{2}$/)
    expect(accounts.map((el) => el.textContent)).toEqual([
      '12345678-01',
      '87654321-01',
    ])
    expect(within(detail).getByText('20')).toBeInTheDocument()
    expect(within(detail).getByText('10')).toBeInTheDocument()
    // 은행 코드가 아니라 사람이 읽는 증권사 이름으로 적는다.
    expect(within(detail).getAllByText('한국투자증권')).toHaveLength(2)
  })

  it('펼친 종목 행을 다시 클릭하면 접는다', async () => {
    respond([holding()])

    render(<AssetsPage />)
    await screen.findByText('삼성전자')

    const row = () => within(holdingsTable()).getAllByRole('row')[1]
    await userEvent.click(row())
    expect(screen.getByText('한국투자증권')).toBeInTheDocument()

    await userEvent.click(row())
    expect(screen.queryByText('한국투자증권')).not.toBeInTheDocument()
  })

  it('한 종목을 펼쳐도 다른 종목은 접힌 채로 둔다', async () => {
    respond([
      holding({ ticker: '005930', name: '삼성전자', quantity: '30' }),
      holding({
        ticker: 'AAPL',
        name: 'Apple',
        quantity: '100',
        accounts: [{ bank: 'hantu', number: '87654321-01', quantity: '100' }],
      }),
    ])

    render(<AssetsPage />)
    await screen.findByText('Apple')

    // 수량 순 정렬이라 AAPL이 첫 행이다.
    await userEvent.click(within(holdingsTable()).getAllByRole('row')[1])

    expect(within(holdingsTable()).getAllByRole('row')).toHaveLength(4)
    expect(screen.getAllByText('한국투자증권')).toHaveLength(1)
  })

  it('모바일 카드도 눌러서 계좌별 보유 수량을 펼친다', async () => {
    viewport.mobile = true
    respond([
      holding({
        quantity: '30',
        accounts: [
          { bank: 'hantu', number: '12345678-01', quantity: '20' },
          { bank: 'hantu', number: '87654321-01', quantity: '10' },
        ],
      }),
    ])

    render(<AssetsPage />)

    const card = await screen.findByRole('button', { name: /005930/ })
    expect(card).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(card)

    expect(card).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('12345678-01')).toBeInTheDocument()
    expect(screen.getByText('87654321-01')).toBeInTheDocument()
  })

  it('기본은 수량이 많은 종목부터 보여주고, 종목명 순으로 바꿀 수 있다', async () => {
    respond([
      holding({ ticker: '005930', name: '삼성전자', quantity: '30' }),
      holding({ ticker: 'AAPL', name: 'Apple', quantity: '100' }),
    ])

    render(<AssetsPage />)

    expect(await screen.findByText('Apple')).toBeInTheDocument()
    // 헤더 다음이 첫 종목이다.
    const rows = within(holdingsTable()).getAllByRole('row')
    expect(within(rows[1]).getByText('AAPL')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '종목명' }))

    const sorted = within(holdingsTable()).getAllByRole('row')
    expect(within(sorted[1]).getByText('Apple')).toBeInTheDocument()
  })

  it('집계된 종목이 없으면 집계를 안내한다', async () => {
    respond([])

    render(<AssetsPage />)

    expect(
      await screen.findByText(/집계된 보유 종목이 없습니다/),
    ).toBeInTheDocument()
  })

  it('집계 요약은 종목 수·계좌 수·최종 변동일을 보여준다', async () => {
    respond([
      holding({ ticker: '005930', quantity: '30' }),
      holding({
        ticker: 'AAPL',
        name: 'Apple',
        quantity: '5',
        as_of: '2026-09-20',
        accounts: [{ bank: 'hantu', number: '87654321-01', quantity: '5' }],
      }),
    ])

    render(<AssetsPage />)

    await screen.findByText('삼성전자')

    expect(within(summaryCard('보유 종목')).getByText('2')).toBeInTheDocument()
    // 한 종목을 여러 계좌에 나눠 들고 있어도 계좌는 중복 없이 센다.
    expect(within(summaryCard('보유 계좌')).getByText('2')).toBeInTheDocument()
    // 종목별 마지막 변동일 중 가장 최근 날짜를 표기한다.
    expect(
      within(summaryCard('최종 변동')).getByText('2026 09 20'),
    ).toBeInTheDocument()
  })

  it('집계 버튼은 집계를 돌린 뒤 표를 다시 읽는다', async () => {
    respond([])
    mockedPost.mockResolvedValue({ data: { trades: 12, points: 7 } })

    render(<AssetsPage />)
    await screen.findByText(/집계된 보유 종목이 없습니다/)

    respond([holding()])
    await userEvent.click(screen.getByRole('button', { name: /집계/ }))

    expect(mockedPost).toHaveBeenCalledWith('/v1/holdings/aggregate')
    expect(await screen.findByText('삼성전자')).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: '거래 12건을 집계했습니다' }),
    )
  })

  it('집계에 실패하면 알린다', async () => {
    respond([])
    mockedPost.mockRejectedValue(new Error('boom'))

    render(<AssetsPage />)
    await screen.findByText(/집계된 보유 종목이 없습니다/)

    await userEvent.click(screen.getByRole('button', { name: /집계/ }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      ),
    )
  })

  it('보유 종목을 불러오지 못하면 알린다', async () => {
    mockedGet.mockRejectedValue(new Error('boom'))

    render(<AssetsPage />)

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '보유 종목을 불러오지 못했습니다',
          type: 'error',
        }),
      ),
    )
  })
})
