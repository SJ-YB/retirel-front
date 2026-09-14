import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ShareAdjustmentSection from './ShareAdjustmentSection'
import { apiClient } from '../../api'
import type { ShareAdjustmentResponse } from '../../types/holding'

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

const BASE = '/v1/holdings/adjustments'

function adjustment(
  overrides: Partial<ShareAdjustmentResponse> = {},
): ShareAdjustmentResponse {
  return {
    ticker: 'IAU',
    effective_date: '2021-05-24',
    old_shares: '2',
    new_shares: '1',
    memo: '1:2 액면병합',
    created_at: '2026-09-14T12:00:00',
    ...overrides,
  }
}

function respond(adjustments: ShareAdjustmentResponse[] = []) {
  mockedGet.mockResolvedValue({ data: adjustments })
}

/** 폼을 IAU 1:2 액면병합으로 채운다. */
function fillForm() {
  fireEvent.change(screen.getByPlaceholderText('예: IAU'), {
    target: { value: 'iau' },
  })
  fireEvent.change(screen.getByLabelText('적용일'), {
    target: { value: '2021-05-24' },
  })
  fireEvent.change(screen.getByLabelText('분할·병합 전 주식 수'), {
    target: { value: '2' },
  })
  fireEvent.change(screen.getByLabelText('분할·병합 후 주식 수'), {
    target: { value: '1' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('ShareAdjustmentSection', () => {
  it('등록된 조정을 종목·적용일·비율로 보여준다', async () => {
    respond([adjustment()])

    render(<ShareAdjustmentSection />)

    expect(await screen.findByText('IAU')).toBeInTheDocument()
    const row = screen.getByText('IAU').closest('tr') as HTMLElement
    expect(within(row).getByText('2021-05-24')).toBeInTheDocument()
    expect(within(row).getByText('2 → 1')).toBeInTheDocument()
    expect(within(row).getByText('1:2 액면병합')).toBeInTheDocument()
  })

  it('등록된 조정이 없으면 비어 있음을 안내한다', async () => {
    respond([])

    render(<ShareAdjustmentSection />)

    expect(
      await screen.findByText('등록된 수량 조정이 없습니다'),
    ).toBeInTheDocument()
  })

  it('등록하면 비율을 문자열로 보내고 표를 다시 읽는다', async () => {
    respond([])
    mockedPost.mockResolvedValue({ data: adjustment() })

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fillForm()
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(BASE, {
        ticker: 'iau',
        effective_date: '2021-05-24',
        // Decimal 자릿수가 새지 않도록 문자열로 보낸다.
        old_shares: '2',
        new_shares: '1',
        memo: null,
      })
    })
    // 등록 뒤 목록을 다시 읽는다(최초 1회 + 등록 후 1회).
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2))
  })

  it('등록에 성공하면 집계까지 끝났음을 알리고 상위에 알린다', async () => {
    respond([])
    mockedPost.mockResolvedValue({ data: adjustment() })
    const onChanged = vi.fn()

    render(<ShareAdjustmentSection onChanged={onChanged} />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fillForm()
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('집계'),
      }),
    )
  })

  it('이미 등록된 종목·적용일이면(409) 안내한다', async () => {
    respond([])
    mockedPost.mockRejectedValue({ response: { status: 409 } })
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fillForm()
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('이미 등록된'),
        }),
      )
    })
  })

  it('비율이 잘못되면(400) 백엔드가 준 사유를 그대로 보여준다', async () => {
    respond([])
    mockedPost.mockRejectedValue({
      response: {
        status: 400,
        data: { detail: '비율이 1:1이면 보유 수량이 바뀌지 않습니다.' },
      },
    })
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fillForm()
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: '비율이 1:1이면 보유 수량이 바뀌지 않습니다.',
        }),
      )
    })
  })

  it('종목코드가 비면 등록하지 않는다', async () => {
    respond([])

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('종목코드'),
        }),
      )
    })
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('비율 칸이 비면 서버에 보내지 않고 어느 칸인지 알린다', async () => {
    // 비면 서버가 422로 거절한다. 그 전에 걸러 어느 칸이 비었는지 알려준다.
    respond([])

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fireEvent.change(screen.getByPlaceholderText('예: IAU'), {
      target: { value: 'IAU' },
    })
    fireEvent.change(screen.getByLabelText('적용일'), {
      target: { value: '2021-05-24' },
    })
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('전 주식 수'),
        }),
      )
    })
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('비율이 0 이하면 서버에 보내지 않는다', async () => {
    respond([])

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fillForm()
    fireEvent.change(screen.getByLabelText('분할·병합 후 주식 수'), {
      target: { value: '0' },
    })
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('0보다 큰'),
        }),
      )
    })
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('요청 검증 실패(422)는 어느 칸이 문제인지 알린다', async () => {
    // FastAPI는 422에서 detail을 문자열이 아니라 오류 객체 배열로 준다. 그대로
    // 토스트에 넘기면 아무것도 안 보여 버튼이 먹통인 것처럼 보였다.
    respond([])
    mockedPost.mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: ['body', 'old_shares'],
              type: 'decimal_parsing',
              msg: 'Input should be a valid decimal',
            },
          ],
        },
      },
    })
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)

    render(<ShareAdjustmentSection />)
    await screen.findByText('등록된 수량 조정이 없습니다')

    fillForm()
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('전 주식 수'),
        }),
      )
    })
  })

  it('삭제를 확인하면 종목·적용일로 지우고 상위에 알린다', async () => {
    respond([adjustment()])
    mockedDelete.mockResolvedValue({ data: undefined })
    const onChanged = vi.fn()

    render(<ShareAdjustmentSection onChanged={onChanged} />)
    await screen.findByText('IAU')

    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    // Popconfirm 확인 버튼을 눌러야 실제 삭제가 호출된다.
    const confirms = await screen.findAllByRole('button', { name: '삭제' })
    await userEvent.click(confirms[confirms.length - 1])

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith(`${BASE}/IAU/2021-05-24`)
    })
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('목록을 불러오지 못하면 알린다', async () => {
    mockedGet.mockRejectedValue(new Error('boom'))

    render(<ShareAdjustmentSection />)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      )
    })
  })
})
