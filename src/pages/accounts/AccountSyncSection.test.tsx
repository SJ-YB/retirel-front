import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccountSyncSection from './AccountSyncSection'
import { apiClient } from '../../api'
import type { SyncState, SyncStatusResponse } from '../../types/transaction'

vi.mock('../../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

const showToast = vi.fn()
vi.mock('../../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

// 컴포넌트는 axios.isAxiosError로 HTTP 상태를 판별한다. 테스트에서 던지는
// 에러 객체를 axios 에러로 인식하도록 결정적으로 모킹한다.
vi.mock('axios', () => ({
  default: {
    isAxiosError: (e: unknown): boolean =>
      typeof e === 'object' && e !== null && 'isAxiosError' in e,
  },
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)

function status(
  overrides: Partial<SyncStatusResponse> & { state: SyncState },
): SyncStatusResponse {
  return {
    bank: 'hantu',
    number: '123-456',
    last_synced_at: null,
    last_error: null,
    started_at: null,
    finished_at: null,
    fetched: null,
    inserted: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

function renderSection() {
  return render(<AccountSyncSection bank="hantu" number="123-456" />)
}

describe('AccountSyncSection', () => {
  it('최근 성공 상태와 신규 건수를 표시한다', async () => {
    mockedGet.mockResolvedValue({
      data: status({
        state: 'succeeded',
        last_synced_at: '2026-05-31T10:00:00',
        fetched: 10,
        inserted: 4,
      }),
    })

    renderSection()

    expect(await screen.findByText('완료')).toBeInTheDocument()
    expect(screen.getByText(/신규 4건/)).toBeInTheDocument()
  })

  it('버튼을 누르면 동기화를 시작하고 진행 상태를 보여준다', async () => {
    mockedGet.mockResolvedValue({ data: status({ state: 'idle' }) })
    mockedPost.mockResolvedValue({ data: status({ state: 'running' }) })

    renderSection()

    await userEvent.click(
      await screen.findByRole('button', { name: '거래내역 동기화' }),
    )

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        '/v1/accounts/hantu/123-456/transactions/sync',
      )
    })
    expect(
      await screen.findByRole('button', { name: '동기화 중…' }),
    ).toBeDisabled()
  })

  it('실패 상태의 오류 메시지를 표시한다', async () => {
    mockedGet.mockResolvedValue({
      data: status({ state: 'failed', last_error: 'KIS 점검 중' }),
    })

    renderSection()

    expect(await screen.findByText('KIS 점검 중')).toBeInTheDocument()
  })

  it('자격증명이 없으면(404) 안내 토스트를 띄운다', async () => {
    mockedGet.mockResolvedValue({ data: status({ state: 'idle' }) })
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    renderSection()

    await userEvent.click(
      await screen.findByRole('button', { name: '거래내역 동기화' }),
    )

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      )
    })
  })
})
