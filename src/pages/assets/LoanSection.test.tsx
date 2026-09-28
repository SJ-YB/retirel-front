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

import AssetsPage from '../AssetsPage'
import { apiClient } from '../../api'
import type { LoanResponse } from '../../types/loan'

vi.mock('../../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

// 수량 조정 섹션은 보유 종목 탭에서만 그려지고 자체 API를 부르므로 비운다.
vi.mock('./ShareAdjustmentSection', () => ({ default: () => null }))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedPut = vi.mocked(apiClient.put)
const mockedDelete = vi.mocked(apiClient.delete)

function loan(overrides: Partial<LoanResponse> = {}): LoanResponse {
  return {
    id: 'loan-1',
    alias: '주택담보대출',
    principal: '300000000',
    interest_rate: '3.5',
    maturity_date: '2046-09-01',
    created_at: '2026-09-26T10:00:00',
    updated_at: '2026-09-26T10:00:00',
    ...overrides,
  }
}

// 대출 목록만 돌려준다. 다시 불러올 때마다 최신 배열을 본다.
// 보유 종목·임대 보증금은 빈 목록.
function serve(state: { loans: LoanResponse[] }) {
  mockedGet.mockImplementation(async (url: string) => {
    if (url === '/v1/loans') return { data: state.loans }
    if (url === '/v1/holdings') return { data: [] }
    if (url === '/v1/rental-deposits') return { data: [] }
    throw new Error(`unexpected GET ${url}`)
  })
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

// 대출 폼의 입력만 골라 채운다. 네이티브 date 입력은 userEvent.type을 지원하지
// 않아 change 이벤트로 값을 넣는다.
async function fillLoanForm(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  values: Partial<Record<'alias' | 'principal' | 'interest_rate', string>> & {
    maturity_date?: string
  },
) {
  const q = within(dialog)
  const labels = {
    alias: '별칭',
    principal: '대출금액',
    interest_rate: '금리 (연, %)',
  } as const
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    const value = values[key]
    if (value === undefined) continue
    await user.clear(q.getByLabelText(labels[key]))
    await user.type(q.getByLabelText(labels[key]), value)
  }
  if (values.maturity_date !== undefined) {
    fireEvent.change(q.getByLabelText('만기일'), {
      target: { value: values.maturity_date },
    })
  }
}

// 테스트 환경에서는 antd Modal의 aria-labelledby가 모두 같은 id라 접근성 이름으로
// 모달을 구분할 수 없다. 제목 텍스트에서 dialog 요소를 거슬러 찾는다.
async function findDialog(title: string): Promise<HTMLElement> {
  const heading = await screen.findByText(title)
  const dialog = heading.closest<HTMLElement>('[role="dialog"]')
  if (!dialog) throw new Error(`dialog not found: ${title}`)
  return dialog
}

async function openDebtsTab(user: ReturnType<typeof userEvent.setup>) {
  render(<AssetsPage />)
  await user.click(screen.getByRole('button', { name: /부채/ }))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('부채 탭', () => {
  it('등록된 대출을 카드로 보여준다', async () => {
    const user = userEvent.setup()
    serve({ loans: [loan()] })

    await openDebtsTab(user)

    expect(await screen.findByText('주택담보대출')).toBeInTheDocument()
    expect(screen.getByText('연 3.5%')).toBeInTheDocument()
    expect(screen.getByText('-300,000,000원')).toBeInTheDocument()
    expect(screen.getByText('2046 09 01')).toBeInTheDocument()
    // 탭 옆 개수도 실제 대출 수를 센다.
    expect(screen.getByRole('button', { name: /부채/ })).toHaveTextContent('1')
  })

  it('대출이 없으면 안내한다', async () => {
    const user = userEvent.setup()
    serve({ loans: [] })

    await openDebtsTab(user)

    expect(
      await screen.findByText('등록된 대출이 없습니다'),
    ).toBeInTheDocument()
  })

  it('대출 폼에는 별칭·대출금액·금리·만기일만 있다', async () => {
    const user = userEvent.setup()
    serve({ loans: [] })

    await openDebtsTab(user)
    await user.click(await screen.findByRole('button', { name: /대출 추가/ }))
    const dialog = await findDialog('대출 등록')

    const labels = Array.from(
      dialog.querySelectorAll('.ant-form-item-label label'),
    ).map((el) => el.textContent)
    expect(labels).toEqual(['별칭', '대출금액', '금리 (연, %)', '만기일'])
  })

  it('대출 폼을 채워 등록하면 금액을 문자열로 보내고 목록을 갱신한다', async () => {
    const user = userEvent.setup()
    const state = { loans: [] as LoanResponse[] }
    serve(state)
    mockedPost.mockImplementation(async () => {
      state.loans = [loan()]
      return { data: loan() }
    })

    await openDebtsTab(user)
    await user.click(await screen.findByRole('button', { name: /대출 추가/ }))
    const dialog = await findDialog('대출 등록')
    await fillLoanForm(user, dialog, {
      alias: ' 주택담보대출 ',
      principal: '300000000',
      interest_rate: '3.5',
      maturity_date: '2046-09-01',
    })
    await user.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/v1/loans', {
        alias: '주택담보대출',
        principal: '300000000',
        interest_rate: '3.5',
        maturity_date: '2046-09-01',
      }),
    )
    expect(await screen.findByText('주택담보대출')).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith({
      message: '대출이 등록되었습니다',
      type: 'success',
    })
  }, 15000) // 여러 필드를 타이핑하므로 전체 스위트와 함께 돌면 기본 5초를 넘길 수 있다.

  it('대출 필수값이 비어 있으면 요청하지 않는다', async () => {
    const user = userEvent.setup()
    serve({ loans: [] })

    await openDebtsTab(user)
    await user.click(await screen.findByRole('button', { name: /대출 추가/ }))
    const dialog = await findDialog('대출 등록')
    await user.click(within(dialog).getByRole('button', { name: '등록' }))

    expect(await screen.findByText('별칭을 입력해주세요')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('대출 카드를 누르면 값이 채워진 수정 모달이 열리고 PUT으로 보낸다', async () => {
    const user = userEvent.setup()
    const state = { loans: [loan()] }
    serve(state)
    mockedPut.mockImplementation(async () => {
      state.loans = [loan({ principal: '200000000' })]
      return { data: loan({ principal: '200000000' }) }
    })

    await openDebtsTab(user)
    await user.click(
      await screen.findByRole('button', { name: '주택담보대출 수정' }),
    )
    const dialog = await findDialog('대출 수정')
    expect(within(dialog).getByLabelText('별칭')).toHaveValue('주택담보대출')
    expect(within(dialog).getByLabelText('만기일')).toHaveValue('2046-09-01')

    await fillLoanForm(user, dialog, { principal: '200000000' })
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() =>
      expect(mockedPut).toHaveBeenCalledWith('/v1/loans/loan-1', {
        alias: '주택담보대출',
        principal: '200000000',
        interest_rate: '3.5',
        maturity_date: '2046-09-01',
      }),
    )
    expect(await screen.findByText('-200,000,000원')).toBeInTheDocument()
  })

  it('대출 입력값이 잘못돼 400이 오면 안내한다', async () => {
    const user = userEvent.setup()
    serve({ loans: [loan()] })
    mockedPut.mockRejectedValue(httpError(400))

    await openDebtsTab(user)
    await user.click(
      await screen.findByRole('button', { name: '주택담보대출 수정' }),
    )
    const dialog = await findDialog('대출 수정')
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
    const state = { loans: [loan()] }
    serve(state)
    mockedDelete.mockImplementation(async () => {
      state.loans = []
      return { data: null }
    })

    await openDebtsTab(user)
    await user.click(
      await screen.findByRole('button', { name: '주택담보대출 수정' }),
    )
    const dialog = await findDialog('대출 수정')
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

  it('대출 목록을 불러오지 못하면 알린다', async () => {
    const user = userEvent.setup()
    mockedGet.mockImplementation(async (url: string) => {
      if (url === '/v1/holdings') return { data: [] }
      if (url === '/v1/rental-deposits') return { data: [] }
      throw new Error('boom')
    })

    await openDebtsTab(user)

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '대출 목록을 불러오지 못했습니다',
        type: 'error',
      }),
    )
  })
})
