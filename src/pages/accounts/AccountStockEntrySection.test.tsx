import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccountStockEntrySection from './AccountStockEntrySection'
import { apiClient } from '../../api'
import type { TransactionApiResponse } from '../../types/transaction'

vi.mock('../../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedDelete = vi.mocked(apiClient.delete)

const BANK = 'hantu'
const NUMBER = '6898828301'

function tx(
  overrides: Partial<TransactionApiResponse> & { id: string },
): TransactionApiResponse {
  return {
    account: { bank: BANK, number: NUMBER },
    type: 'buy',
    traded_at: '2021-08-06',
    amount: { currency: 'krw', amount: '90000' },
    ticker: '377300',
    name: '카카오페이',
    quantity: '1',
    fee: null,
    tax: null,
    manual: true,
    ...overrides,
  }
}

function renderSection() {
  return render(<AccountStockEntrySection bank={BANK} number={NUMBER} />)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AccountStockEntrySection', () => {
  it('이 계좌의 수기 매수·매도만 보여준다', async () => {
    mockedGet.mockResolvedValue({
      data: [
        tx({ id: 'm-1' }),
        // 연동 체결, 다른 계좌, 매매가 아닌 수기 거래는 제외된다.
        tx({ id: 'kis', manual: false, ticker: '005930', name: '삼성전자' }),
        tx({
          id: 'other',
          account: { bank: BANK, number: 'x' },
          name: '다른계좌',
        }),
        tx({ id: 'dep', type: 'deposit', name: '입금' }),
      ],
    })

    renderSection()

    expect(await screen.findByText('카카오페이')).toBeInTheDocument()
    expect(screen.getByText('₩90,000')).toBeInTheDocument()
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument()
    expect(screen.queryByText('다른계좌')).not.toBeInTheDocument()
    expect(screen.queryByText('입금')).not.toBeInTheDocument()
  })

  it('입고 내역을 추가한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })
    mockedPost.mockResolvedValue({ data: {} })

    renderSection()
    await screen.findByText('아직 입력한 입출고 내역이 없습니다')

    fireEvent.change(screen.getByLabelText('입출고일'), {
      target: { value: '2021-08-06' },
    })
    await user.type(screen.getByLabelText('종목코드'), ' 377300 ')
    await user.type(screen.getByLabelText('수량'), '1')
    await user.type(screen.getByLabelText('주당 가격'), '90000')
    await user.click(screen.getByRole('button', { name: '추가' }))

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1))
    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/accounts/hantu/6898828301/stock-entries',
      {
        occurred_on: '2021-08-06',
        ticker: '377300',
        quantity: '1',
        unit_price: '90000',
        currency: 'krw',
        side: 'buy',
      },
    )
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2))
  })

  it('종목코드와 수량을 입력하기 전에는 추가할 수 없다', async () => {
    mockedGet.mockResolvedValue({ data: [] })

    renderSection()
    await screen.findByText('아직 입력한 입출고 내역이 없습니다')

    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  it('입력한 내역을 삭제한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [tx({ id: 'm-1' })] })
    mockedDelete.mockResolvedValue({ data: undefined })

    renderSection()
    await user.click(await screen.findByRole('button', { name: '삭제' }))
    await screen.findByText(/삭제할까요/)
    const buttons = screen.getAllByRole('button', { name: '삭제' })
    await user.click(buttons[buttons.length - 1])

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith('/v1/transactions/m-1'),
    )
  })
})
