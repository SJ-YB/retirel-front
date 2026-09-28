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
import type { RentalDepositResponse } from '../../types/rentalDeposit'

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

function deposit(
  overrides: Partial<RentalDepositResponse> = {},
): RentalDepositResponse {
  return {
    id: 'deposit-1',
    alias: '마포 전세',
    amount: '180000000',
    maturity_date: '2027-08-31',
    created_at: '2026-09-28T10:00:00',
    updated_at: '2026-09-28T10:00:00',
    ...overrides,
  }
}

// 임대 보증금 목록만 돌려준다. 다시 불러올 때마다 최신 배열을 본다.
// 보유 종목·대출은 빈 목록.
function serve(state: { deposits: RentalDepositResponse[] }) {
  mockedGet.mockImplementation(async (url: string) => {
    if (url === '/v1/rental-deposits') return { data: state.deposits }
    if (url === '/v1/holdings') return { data: [] }
    if (url === '/v1/loans') return { data: [] }
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

// 보증금 폼의 입력만 골라 채운다. 네이티브 date 입력은 userEvent.type을 지원하지
// 않아 change 이벤트로 값을 넣는다.
async function fillDepositForm(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  values: Partial<Record<'alias' | 'amount' | 'maturity_date', string>>,
) {
  const q = within(dialog)
  const labels = { alias: '별칭', amount: '보증금' } as const
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

async function openDepositsTab(user: ReturnType<typeof userEvent.setup>) {
  render(<AssetsPage />)
  await user.click(screen.getByRole('button', { name: /임대 보증금/ }))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('임대 보증금 탭', () => {
  it('등록된 보증금을 카드로 보여준다', async () => {
    const user = userEvent.setup()
    serve({ deposits: [deposit()] })

    await openDepositsTab(user)

    expect(await screen.findByText('마포 전세')).toBeInTheDocument()
    expect(screen.getByText('+180,000,000원')).toBeInTheDocument()
    expect(screen.getByText('2027 08 31')).toBeInTheDocument()
    // 탭 옆 개수도 실제 보증금 수를 센다.
    expect(
      screen.getByRole('button', { name: /임대 보증금/ }),
    ).toHaveTextContent('1')
  })

  it('보증금이 없으면 안내한다', async () => {
    const user = userEvent.setup()
    serve({ deposits: [] })

    await openDepositsTab(user)

    expect(
      await screen.findByText('등록된 임대 보증금이 없습니다'),
    ).toBeInTheDocument()
  })

  it('보증금 폼에는 별칭·보증금·만기일만 있다', async () => {
    const user = userEvent.setup()
    serve({ deposits: [] })

    await openDepositsTab(user)
    await user.click(await screen.findByRole('button', { name: /보증금 추가/ }))
    const dialog = await findDialog('임대 보증금 등록')

    const labels = Array.from(
      dialog.querySelectorAll('.ant-form-item-label label'),
    ).map((el) => el.textContent)
    expect(labels).toEqual(['별칭', '보증금', '만기일'])
  })

  it('보증금 폼을 채워 등록하면 금액을 문자열로 보내고 목록을 갱신한다', async () => {
    const user = userEvent.setup()
    const state = { deposits: [] as RentalDepositResponse[] }
    serve(state)
    mockedPost.mockImplementation(async () => {
      state.deposits = [deposit()]
      return { data: deposit() }
    })

    await openDepositsTab(user)
    await user.click(await screen.findByRole('button', { name: /보증금 추가/ }))
    const dialog = await findDialog('임대 보증금 등록')
    await fillDepositForm(user, dialog, {
      alias: ' 마포 전세 ',
      amount: '180000000',
      maturity_date: '2027-08-31',
    })
    await user.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/v1/rental-deposits', {
        alias: '마포 전세',
        amount: '180000000',
        maturity_date: '2027-08-31',
      }),
    )
    expect(await screen.findByText('마포 전세')).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith({
      message: '임대 보증금이 등록되었습니다',
      type: 'success',
    })
  }, 15000) // 여러 필드를 타이핑하므로 전체 스위트와 함께 돌면 기본 5초를 넘길 수 있다.

  it('보증금 필수값이 비어 있으면 요청하지 않는다', async () => {
    const user = userEvent.setup()
    serve({ deposits: [] })

    await openDepositsTab(user)
    await user.click(await screen.findByRole('button', { name: /보증금 추가/ }))
    const dialog = await findDialog('임대 보증금 등록')
    await user.click(within(dialog).getByRole('button', { name: '등록' }))

    expect(await screen.findByText('별칭을 입력해주세요')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('보증금 카드를 누르면 값이 채워진 수정 모달이 열리고 PUT으로 보낸다', async () => {
    const user = userEvent.setup()
    const state = { deposits: [deposit()] }
    serve(state)
    mockedPut.mockImplementation(async () => {
      state.deposits = [deposit({ amount: '200000000' })]
      return { data: deposit({ amount: '200000000' }) }
    })

    await openDepositsTab(user)
    await user.click(
      await screen.findByRole('button', { name: '마포 전세 수정' }),
    )
    const dialog = await findDialog('임대 보증금 수정')
    expect(within(dialog).getByLabelText('별칭')).toHaveValue('마포 전세')
    expect(within(dialog).getByLabelText('만기일')).toHaveValue('2027-08-31')

    await fillDepositForm(user, dialog, { amount: '200000000' })
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() =>
      expect(mockedPut).toHaveBeenCalledWith('/v1/rental-deposits/deposit-1', {
        alias: '마포 전세',
        amount: '200000000',
        maturity_date: '2027-08-31',
      }),
    )
    expect(await screen.findByText('+200,000,000원')).toBeInTheDocument()
  })

  it('보증금 입력값이 잘못돼 400이 오면 안내한다', async () => {
    const user = userEvent.setup()
    serve({ deposits: [deposit()] })
    mockedPut.mockRejectedValue(httpError(400))

    await openDepositsTab(user)
    await user.click(
      await screen.findByRole('button', { name: '마포 전세 수정' }),
    )
    const dialog = await findDialog('임대 보증금 수정')
    await user.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '입력값이 올바르지 않습니다',
        type: 'error',
      }),
    )
  })

  it('확인을 거쳐 보증금을 삭제한다', async () => {
    const user = userEvent.setup()
    const state = { deposits: [deposit()] }
    serve(state)
    mockedDelete.mockImplementation(async () => {
      state.deposits = []
      return { data: null }
    })

    await openDepositsTab(user)
    await user.click(
      await screen.findByRole('button', { name: '마포 전세 수정' }),
    )
    const dialog = await findDialog('임대 보증금 수정')
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))
    // 모달 안의 삭제 버튼과 확인 팝업의 삭제 버튼을 구분해 누른다.
    const confirm = await screen.findByRole('tooltip')
    await user.click(within(confirm).getByRole('button', { name: '삭제' }))

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith(
        '/v1/rental-deposits/deposit-1',
      ),
    )
    expect(
      await screen.findByText('등록된 임대 보증금이 없습니다'),
    ).toBeInTheDocument()
  })

  it('보증금 목록을 불러오지 못하면 알린다', async () => {
    const user = userEvent.setup()
    mockedGet.mockImplementation(async (url: string) => {
      if (url === '/v1/holdings') return { data: [] }
      if (url === '/v1/loans') return { data: [] }
      throw new Error('boom')
    })

    await openDepositsTab(user)

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '임대 보증금 목록을 불러오지 못했습니다',
        type: 'error',
      }),
    )
  })
})
