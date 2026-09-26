import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccountDepositSection from './AccountDepositSection'
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

const BANK = 'woori'
const NUMBER = '1002-123-456789'

function tx(
  overrides: Partial<TransactionApiResponse> & { id: string },
): TransactionApiResponse {
  return {
    account: { bank: BANK, number: NUMBER },
    type: 'deposit',
    traded_at: '2026-09-25',
    amount: { currency: 'krw', amount: '100000' },
    ticker: null,
    name: null,
    quantity: null,
    fee: null,
    tax: null,
    manual: true,
    ...overrides,
  }
}

function renderSection() {
  return render(<AccountDepositSection bank={BANK} number={NUMBER} />)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AccountDepositSection', () => {
  it('이 계좌의 입금만 모아 최신순으로 보여주고 총 납입액을 합산한다', async () => {
    mockedGet.mockResolvedValue({
      data: [
        tx({ id: 'm-1', traded_at: '2026-08-25' }),
        tx({
          id: 'm-2',
          traded_at: '2026-09-25',
          amount: { currency: 'krw', amount: '250000' },
        }),
        // 다른 계좌의 입금과 이 계좌의 입금이 아닌 거래는 제외된다.
        tx({ id: 'other', account: { bank: 'hantu', number: NUMBER } }),
        tx({ id: 'wd', type: 'withdrawal' }),
      ],
    })

    renderSection()

    expect(await screen.findByText('2026-09-25')).toBeInTheDocument()
    expect(screen.getByTestId('deposit-total')).toHaveTextContent('₩ 350,000')
    expect(screen.getByText('· 2회')).toBeInTheDocument()
    const dates = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(dates).toEqual(['2026-09-25', '2026-08-25'])
  })

  it('납입일과 금액을 입력해 납입을 추가한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })
    mockedPost.mockResolvedValue({ data: {} })

    renderSection()
    await screen.findByText('아직 입력한 납입 내역이 없습니다')

    fireEvent.change(screen.getByLabelText('납입일'), {
      target: { value: '2026-09-25' },
    })
    await user.type(screen.getByLabelText('납입 금액'), '100000')
    await user.click(screen.getByRole('button', { name: '납입 추가' }))

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1))
    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/accounts/woori/1002-123-456789/deposits',
      { deposited_on: '2026-09-25', amount: '100000' },
    )
    // 추가 후 목록을 다시 불러온다.
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2))
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    )
  })

  it('금액을 입력하기 전에는 추가할 수 없다', async () => {
    mockedGet.mockResolvedValue({ data: [] })

    renderSection()
    await screen.findByText('아직 입력한 납입 내역이 없습니다')

    expect(screen.getByRole('button', { name: '납입 추가' })).toBeDisabled()
  })

  it('수기 입력한 납입을 삭제한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [tx({ id: 'm-1' })] })
    mockedDelete.mockResolvedValue({ data: undefined })

    renderSection()
    await user.click(await screen.findByRole('button', { name: '삭제' }))
    // 행의 "삭제"는 확인 팝업을 열 뿐이다. 팝업의 확인 버튼(마지막 "삭제")을
    // 눌러야 실제 삭제가 호출된다.
    await screen.findByText(/납입을 삭제할까요/)
    expect(mockedDelete).not.toHaveBeenCalled()
    const buttons = screen.getAllByRole('button', { name: '삭제' })
    await user.click(buttons[buttons.length - 1])

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith('/v1/transactions/m-1'),
    )
  })

  it('연동으로 들어온 입금은 삭제 버튼을 보이지 않는다', async () => {
    mockedGet.mockResolvedValue({ data: [tx({ id: 'kis-1', manual: false })] })

    renderSection()

    expect(await screen.findByText('2026-09-25')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '삭제' }),
    ).not.toBeInTheDocument()
  })
})
