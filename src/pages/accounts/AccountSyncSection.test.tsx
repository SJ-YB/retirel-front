import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccountSyncSection from './AccountSyncSection'
import { apiClient } from '../../api'
import type { SyncState, SyncStatusResponse } from '../../types/transaction'

vi.mock('../../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedDelete = vi.mocked(apiClient.delete)

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

function renderSection() {
  return render(<AccountSyncSection bank="hantu" number="123-456" />)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

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
    // running 상태로 전환되면 진행 태그가 뜨고 버튼이 로딩 상태가 된다
    // (antd 로딩 버튼은 disabled 속성 대신 loading 클래스로 중복 클릭을 막는다).
    expect(await screen.findByText('동기화 중')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /동기화 중/ }).className,
      ).toContain('ant-btn-loading')
    })
  })

  it('실패 상태의 오류 메시지를 표시한다', async () => {
    mockedGet.mockResolvedValue({
      data: status({ state: 'failed', last_error: 'KIS 점검 중' }),
    })

    renderSection()

    expect(await screen.findByText('KIS 점검 중')).toBeInTheDocument()
  })

  it('전체 삭제를 확인하면 거래내역을 삭제하고 건수를 토스트로 알린다', async () => {
    mockedGet.mockResolvedValue({ data: status({ state: 'succeeded' }) })
    mockedDelete.mockResolvedValue({ data: { deleted: 12 } })

    renderSection()

    await userEvent.click(
      await screen.findByRole('button', { name: '거래내역 전체 삭제' }),
    )
    // Popconfirm 확인 버튼을 눌러야 실제 삭제가 호출된다.
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith(
        '/v1/accounts/hantu/123-456/transactions',
      )
    })
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('12건'),
        }),
      )
    })
  })

  it('동기화 중(409)에는 삭제 실패 안내 토스트를 띄운다', async () => {
    mockedGet.mockResolvedValue({ data: status({ state: 'succeeded' }) })
    mockedDelete.mockRejectedValue({ response: { status: 409 } })
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)

    renderSection()

    await userEvent.click(
      await screen.findByRole('button', { name: '거래내역 전체 삭제' }),
    )
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('진행 중'),
        }),
      )
    })
  })

  it('자격증명이 없으면(404) 안내 토스트를 띄운다', async () => {
    mockedGet.mockResolvedValue({ data: status({ state: 'idle' }) })
    mockedPost.mockRejectedValue({ response: { status: 404 } })
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)

    renderSection()

    await userEvent.click(
      await screen.findByRole('button', { name: '거래내역 동기화' }),
    )

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('API 연동'),
        }),
      )
    })
  })
})
