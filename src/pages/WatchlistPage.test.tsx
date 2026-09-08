import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import WatchlistPage from './WatchlistPage'
import { apiClient } from '../api'
import type { WatchedStockResponse } from '../types/watchlist'

vi.mock('../api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

// vi.mock 팩토리는 호이스팅되므로, 그 안에서 참조하는 스파이도 vi.hoisted로
// 함께 끌어올려 테스트가 보는 것과 같은 인스턴스를 보장한다.
const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))
vi.mock('../stores', () => ({
  useUiStore: () => ({ showToast }),
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedDelete = vi.mocked(apiClient.delete)

function stock(
  overrides: Partial<WatchedStockResponse> = {},
): WatchedStockResponse {
  return {
    market: 'nas',
    ticker: 'NVDA',
    name: '엔비디아',
    created_at: '2026-09-08T10:00:00',
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

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('WatchlistPage', () => {
  it('등록된 관찰 종목을 표시한다', async () => {
    mockedGet.mockResolvedValue({ data: [stock()] })

    render(<WatchlistPage />)

    expect(await screen.findByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('엔비디아')).toBeInTheDocument()
    expect(screen.getByText('NAS')).toBeInTheDocument()
  })

  it('관찰 종목이 없으면 빈 상태를 안내한다', async () => {
    mockedGet.mockResolvedValue({ data: [] })

    render(<WatchlistPage />)

    expect(
      await screen.findByText('등록된 관찰 종목이 없습니다'),
    ).toBeInTheDocument()
  })

  it('종목코드와 종목명을 입력해 등록하고 목록을 갱신한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValueOnce({ data: [] })
    mockedPost.mockResolvedValue({
      data: stock({ market: 'krx', ticker: '005930' }),
    })
    mockedGet.mockResolvedValueOnce({
      data: [stock({ market: 'krx', ticker: '005930', name: '삼성전자' })],
    })

    render(<WatchlistPage />)
    await screen.findByText('등록된 관찰 종목이 없습니다')

    await user.type(screen.getByLabelText('종목코드'), '005930')
    await user.type(screen.getByLabelText('종목명'), '삼성전자')
    await user.click(screen.getByRole('button', { name: /등록/ }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/v1/watchlist', {
        market: 'krx',
        ticker: '005930',
        name: '삼성전자',
      }),
    )
    expect(await screen.findByText('005930')).toBeInTheDocument()
  })

  it('종목명을 비우면 요청 본문에서 뺀다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })
    mockedPost.mockResolvedValue({ data: stock() })

    render(<WatchlistPage />)
    await screen.findByText('등록된 관찰 종목이 없습니다')

    await user.type(screen.getByLabelText('종목코드'), ' 005930 ')
    await user.click(screen.getByRole('button', { name: /등록/ }))

    // 앞뒤 공백은 보내기 전에 정리하고, 빈 종목명은 아예 싣지 않는다.
    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/v1/watchlist', {
        market: 'krx',
        ticker: '005930',
      }),
    )
  })

  it('종목코드가 비어 있으면 요청하지 않는다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })

    render(<WatchlistPage />)
    await screen.findByText('등록된 관찰 종목이 없습니다')

    await user.click(screen.getByRole('button', { name: /등록/ }))

    expect(mockedPost).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith({
      message: '종목코드를 입력하세요',
      type: 'warning',
    })
  })

  it('이미 등록된 종목이면 중복 안내를 띄운다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })
    mockedPost.mockRejectedValue(httpError(409))

    render(<WatchlistPage />)
    await screen.findByText('등록된 관찰 종목이 없습니다')

    await user.type(screen.getByLabelText('종목코드'), 'NVDA')
    await user.click(screen.getByRole('button', { name: /등록/ }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '이미 등록된 종목입니다',
        type: 'error',
      }),
    )
  })

  it('종목코드 형식이 잘못되면 형식 오류를 안내한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue({ data: [] })
    mockedPost.mockRejectedValue(httpError(400))

    render(<WatchlistPage />)
    await screen.findByText('등록된 관찰 종목이 없습니다')

    await user.type(screen.getByLabelText('종목코드'), '12345')
    await user.click(screen.getByRole('button', { name: /등록/ }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        message: '종목코드 형식이 올바르지 않습니다',
        type: 'error',
      }),
    )
  })

  it('확인을 거쳐 관찰 대상에서 해제한다', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValueOnce({ data: [stock()] })
    mockedDelete.mockResolvedValue({ data: null })
    mockedGet.mockResolvedValueOnce({ data: [] })

    render(<WatchlistPage />)
    await screen.findByText('NVDA')

    // 목록의 해제 버튼과 확인 팝업의 해제 버튼을 구분해 누른다.
    await user.click(screen.getByRole('button', { name: 'NVDA 해제' }))
    await user.click(await screen.findByRole('button', { name: '해제' }))

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith('/v1/watchlist/nas/NVDA'),
    )
    expect(
      await screen.findByText('등록된 관찰 종목이 없습니다'),
    ).toBeInTheDocument()
  })
})
