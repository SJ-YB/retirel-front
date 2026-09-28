import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccountsPage from './AccountsPage'
import { apiClient } from '../api'
import type { AccountApiResponse } from '../types/account'

vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

// 자격증명·동기화 섹션은 계좌 수정 모달에서만 쓰이고 각자 API를 부르므로 비운다.
vi.mock('./accounts/AccountCredentialSection', () => ({ default: () => null }))
vi.mock('./accounts/AccountSyncSection', () => ({ default: () => null }))

const mockedGet = vi.mocked(apiClient.get)

function account(
  overrides: Partial<AccountApiResponse> = {},
): AccountApiResponse {
  return {
    number: '123-456-789012',
    owner: '남편',
    bank: 'hantu',
    nickname: '주거래 계좌',
    type: 'brokerage',
    ...overrides,
  }
}

// 계좌 목록을 돌려준다. 다시 불러올 때마다 최신 배열을 본다.
function serve(state: { accounts: AccountApiResponse[] }) {
  mockedGet.mockImplementation(async (url: string) => {
    if (url === '/v1/accounts') return { data: state.accounts }
    throw new Error(`unexpected GET ${url}`)
  })
}

// 테스트 환경에서는 antd Modal의 aria-labelledby가 모두 같은 id라 접근성 이름으로
// 모달을 구분할 수 없다. 제목 텍스트에서 dialog 요소를 거슬러 찾는다.
async function findDialog(title: string): Promise<HTMLElement> {
  const heading = await screen.findByText(title)
  const dialog = heading.closest<HTMLElement>('[role="dialog"]')
  if (!dialog) throw new Error(`dialog not found: ${title}`)
  return dialog
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('AccountsPage', () => {
  it('등록된 계좌를 표시하고 대출은 부르지 않는다', async () => {
    serve({ accounts: [account()] })

    render(<AccountsPage />)

    expect(await screen.findByText('주거래 계좌')).toBeInTheDocument()
    // 대출은 자산 화면 부채 탭에서 관리한다.
    expect(mockedGet).not.toHaveBeenCalledWith('/v1/loans')
    expect(screen.queryByText('LOANS')).toBeNull()
  })

  it('계좌 등록 모달에는 대출 전환 없이 계좌 폼만 열린다', async () => {
    const user = userEvent.setup()
    serve({ accounts: [] })

    render(<AccountsPage />)
    await screen.findByText('등록된 계좌가 없습니다')

    await user.click(screen.getAllByRole('button', { name: /New Account/ })[0])
    const dialog = await findDialog('계좌 등록')
    expect(within(dialog).getByLabelText('계좌번호')).toBeInTheDocument()
    expect(within(dialog).queryByText('대출')).toBeNull()
  })
})
