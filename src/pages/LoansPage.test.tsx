import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LoansPage from './LoansPage'
import { apiClient } from '../api'
import type { LoanResponse } from '../types/loan'

vi.mock('../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedPut = vi.mocked(apiClient.put)
const mockedDelete = vi.mocked(apiClient.delete)

function loan(overrides: Partial<LoanResponse> = {}): LoanResponse {
  return {
    id: 'loan-1',
    alias: '주택담보대출',
    account: '국민은행 123-456',
    principal: '300000000',
    interest_rate: '3.5',
    balance: '250000000',
    maturity_date: '2046-09-01',
    created_at: '2026-09-26T10:00:00',
    updated_at: '2026-09-26T10:00:00',
    ...overrides,
  }
}

function httpError(status: number): AxiosError {
  const error = new AxiosError('failed')
  error.response = {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: {} },
  } as AxiosError['response']
  return error
}

// 모달 안의 입력만 골라 채운다. 네이티브 date 입력은 userEvent.type을 지원하지
// 않아 change 이벤트로 값을 넣는다.
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  values: {
    alias?: string
    account?: string
    principal?: string
    interest_rate?: string
    balance?: string
    maturity_date?: string
  },
) {
  const q = within(dialog)
  if (values.alias !== undefined) {
    await user.clear(q.getByLabelText('별칭'))
    await user.type(q.getByLabelText('별칭'), values.alias)
  }
  if (values.account !== undefined) {
    await user.clear(q.getByLabelText('계좌'))
    await user.type(q.getByLabelText('계좌'), values.account)
  }
  if (values.principal !== undefined) {
    await user.clear(q.getByLabelText('원금'))
    await user.type(q.getByLabelText('원금'), values.principal)
  }
  if (values.interest_rate !== undefined) {
    await user.clear(q.getByLabelText('금리 (연, %)'))
    await user.type(q.getByLabelText('금리 (연, %)'), values.interest_rate)
  }
  if (values.balance !== undefined) {
    await user.clear(q.getByLabelText('잔액'))
    await user.type(q.getByLabelText('잔액'), values.balance)
  }
  if (values.maturity_date !== undefined) {
    fireEvent.change(q.getByLabelText('만기일'), {
      target: { value: values.maturity_date },
    })
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('LoansPage', () => {
  it('등록된 대출을 표시한다', async () => {
    mockedGet.mockResolvedValue({ data: [loan()] })

    render(<LoansPage />)

    expect(await screen.findByText('주택담보대출')).toBeInTheDocument()
    expect(screen.getByText('국민은행 123-456')).toBeInTheDocument()
    expect(screen.getByText('연 3.5%')).toBeInTheDocument()
    expect(screen.getByText('250,000,000원')).toBeInTheDocument()
    expect(
      screen.getByText('원금 300,000,000원 · 상환 17%'),
    ).toBeInTheDocument()
    // 카드의 만기일과 요약 바의 가장 가까운 만기, 두 곳에 나타난다.
    expect(screen.getAllByText('2046 09 01')).toHaveLength(2)
  })

  it('대출이 없으면 빈 상태를 안내한다', async () => {
    mockedGet.mockResolvedValue({ data: [] })

    render(<LoansPage />)

    expect(
      await screen.findByText('등록된 대출이 없습니다'),
    ).toBeInTheDocument()
  })

  it('요약 바에 총 잔액과 가장 가까운 만기를 보여준다', async () => {
    mockedGet.mockResolvedValue({
      data: [
        loan({ id: 'a', maturity_date: '2030-01-01' }),
        loan({ id: 'b', balance: '50000000', maturity_date: '2040-01-01' }),
      ],
    })

    render(<LoansPage />)

    expect(await screen.findByText('₩ 300.0M')).toBeInTheDocument()
    expect(screen.getAllByText('2030 01 01')).toHaveLength(2)
  })

  it('폼을 채워 등록하면 금액을 문자열로 보내고 목록을 갱신한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValueOnce({ data: [] })
    mockedPost.mockResolvedValue({ data: loan() })
    mockedGet.mockResolvedValueOnce({ data: [loan()] })

    render(<LoansPage />)
    await screen.findByText('등록된 대출이 없습니다')

    await user.click(screen.getByRole('button', { name: /New Loan/ }))
    const dialog = await screen.findByRole('dialog')
    await fillForm(user, dialog, {
      alias: ' 주택담보대출 ',
      account: '국민은행 123-456',
      principal: '300000000',
      interest_rate: '3.5',
      balance: '250000000',
      maturity_date: '2046-09-01',
    })
    await user.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/v1/loans', {
        alias: '주택담보대출',
        account: '국민은행 123-456',
        principal: '300000000',
        interest_rate: '3.5',
        balance: '250000000',
        maturity_date: '2046-09-01',
      }),
    )
    expect(await screen.findByText('주택담보대출')).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith({
      message: '대출이 등록되었습니다',
      type: 'success',
    })
  })

  it('필수값이 비어 있으면 요청하지 않는다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })

    render(<LoansPage />)
    await screen.findByText('등록된 대출이 없습니다')

    await user.click(screen.getByRole('button', { name: /New Loan/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '등록' }))

    expect(await screen.findByText('별칭을 입력해주세요')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('카드를 누르면 값이 채워진 수정 모달이 열리고 PUT으로 보낸다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValueOnce({ data: [loan()] })
    mockedPut.mockResolvedValue({ data: loan({ balance: '200000000' }) })
    mockedGet.mockResolvedValueOnce({ data: [loan({ balance: '200000000' })] })

    render(<LoansPage />)
    await screen.findByText('주택담보대출')

    await user.click(screen.getByRole('button', { name: '주택담보대출 수정' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('별칭')).toHaveValue('주택담보대출')
    expect(within(dialog).getByLabelText('만기일')).toHaveValue('2046-09-01')

    await fillForm(user, dialog, { balance: '200000000' })
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() =>
      expect(mockedPut).toHaveBeenCalledWith('/v1/loans/loan-1', {
        alias: '주택담보대출',
        account: '국민은행 123-456',
        principal: '300000000',
        interest_rate: '3.5',
        balance: '200000000',
        maturity_date: '2046-09-01',
      }),
    )
    expect(await screen.findByText('200,000,000원')).toBeInTheDocument()
  })

  it('입력값이 잘못돼 400이 오면 안내한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [loan()] })
    mockedPut.mockRejectedValue(httpError(400))

    render(<LoansPage />)
    await screen.findByText('주택담보대출')

    await user.click(screen.getByRole('button', { name: '주택담보대출 수정' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '입력값이 올바르지 않습니다',
        type: 'error',
      }),
    )
  })

  it('확인을 거쳐 대출을 삭제한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValueOnce({ data: [loan()] })
    mockedDelete.mockResolvedValue({ data: null })
    mockedGet.mockResolvedValueOnce({ data: [] })

    render(<LoansPage />)
    await screen.findByText('주택담보대출')

    await user.click(screen.getByRole('button', { name: '주택담보대출 수정' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))
    // 모달 안의 삭제 버튼과 확인 팝업의 삭제 버튼을 구분해 누른다.
    const confirm = await screen.findByRole('tooltip')
    await user.click(within(confirm).getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith('/v1/loans/loan-1'),
    )
    expect(
      await screen.findByText('등록된 대출이 없습니다'),
    ).toBeInTheDocument()
  })
})
