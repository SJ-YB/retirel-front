import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import TransactionsPage from './TransactionsPage'
import { apiClient } from '../api'
import type { TransactionApiResponse } from '../types/transaction'

vi.mock('../api', () => ({
  apiClient: { get: vi.fn() },
}))

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

const mockedGet = vi.mocked(apiClient.get)

function tx(
  overrides: Partial<TransactionApiResponse> = {},
): TransactionApiResponse {
  return {
    id: 'tx-1',
    account: { bank: 'hantu', number: '12345678-01' },
    type: 'dividend',
    traded_at: '2026-09-15',
    amount: { currency: 'usd', amount: '26.90' },
    ticker: 'O',
    name: 'REALTY INCOME',
    quantity: null,
    fee: null,
    tax: { currency: 'usd', amount: '4.04' },
    manual: false,
    ...overrides,
  }
}

function serve(transactions: TransactionApiResponse[]) {
  mockedGet.mockImplementation(async (url: string) => {
    if (url === '/v1/transactions') return { data: transactions }
    if (url === '/v1/accounts') return { data: [] }
    return { data: { data: [] } }
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('TransactionsPage 배당', () => {
  it('배당 금액은 세금을 뺀 실수령액으로 보이고 세전·세금을 함께 적는다', async () => {
    serve([tx()])

    render(<TransactionsPage />)

    expect(await screen.findByText('+ $ 22.86')).toBeInTheDocument()
    expect(
      screen.getByText(/세전 \$ 26\.90 · 세금 \$ 4\.04/),
    ).toBeInTheDocument()
  })

  it('추정 배당에는 추정 표시를 붙인다', async () => {
    serve([tx({ estimated: true })])

    render(<TransactionsPage />)

    expect(await screen.findByText('추정')).toBeInTheDocument()
  })

  it('실수령 배당에는 추정 표시가 없다', async () => {
    serve([tx({ estimated: false })])

    render(<TransactionsPage />)

    await screen.findByText('+ $ 22.86')
    expect(screen.queryByText('추정')).not.toBeInTheDocument()
  })

  it('세금이 없는 배당은 금액 그대로 보이고 세전 내역을 적지 않는다', async () => {
    serve([tx({ tax: null })])

    render(<TransactionsPage />)

    expect(await screen.findByText('+ $ 26.90')).toBeInTheDocument()
    expect(screen.queryByText(/세전/)).not.toBeInTheDocument()
  })

  it('매수 금액은 세금과 무관하게 그대로 보인다', async () => {
    serve([
      tx({
        type: 'buy',
        quantity: '10',
        amount: { currency: 'usd', amount: '560.00' },
        tax: { currency: 'usd', amount: '1.00' },
      }),
    ])

    render(<TransactionsPage />)

    expect(await screen.findByText('- $ 560.00')).toBeInTheDocument()
  })
})
