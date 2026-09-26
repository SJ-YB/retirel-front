import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AccountFormModal from './AccountFormModal'
import { fromApiAccount } from '../../utils/account'

// 수정 모드에서만 마운트되는 자격증명·동기화 섹션은 이 테스트의 관심사가 아니다.
vi.mock('./AccountCredentialSection', () => ({
  default: () => null,
}))
vi.mock('./AccountSyncSection', () => ({
  default: () => null,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('AccountFormModal', () => {
  it('등록 시 계좌 유형은 기본으로 증권 계좌이며, 제출값에 포함된다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AccountFormModal
        open
        account={null}
        onClose={() => {}}
        onSubmit={onSubmit}
        loading={false}
      />,
    )

    expect(screen.getByLabelText('계좌 유형')).toBeInTheDocument()
    expect(screen.getByText('위탁')).toBeInTheDocument()

    await user.type(screen.getByLabelText('별칭'), '메인')
    await user.type(screen.getByLabelText('계좌번호'), '123-456')
    await user.type(screen.getByLabelText('소유자'), '남편')
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: '메인',
      accountNumber: '123-456',
      ownerName: '남편',
      type: 'brokerage',
    })
  })

  it('주택청약을 고르면 제출값의 유형이 housing_subscription이다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AccountFormModal
        open
        account={null}
        onClose={() => {}}
        onSubmit={onSubmit}
        loading={false}
      />,
    )

    await user.click(screen.getByLabelText('계좌 유형'))
    await user.click(await screen.findByTitle('주택청약'))

    await user.type(screen.getByLabelText('별칭'), '청약')
    await user.type(screen.getByLabelText('계좌번호'), '999-000')
    await user.type(screen.getByLabelText('소유자'), '아내')
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      type: 'housing_subscription',
    })
  })

  it('우리은행 주택청약 계좌를 등록할 수 있다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AccountFormModal
        open
        account={null}
        onClose={() => {}}
        onSubmit={onSubmit}
        loading={false}
      />,
    )

    await user.click(screen.getByLabelText('금융사'))
    await user.click(await screen.findByTitle('우리은행'))
    await user.click(screen.getByLabelText('계좌 유형'))
    await user.click(await screen.findByTitle('주택청약'))

    await user.type(screen.getByLabelText('별칭'), '청약')
    await user.type(screen.getByLabelText('계좌번호'), '1002-123-456789')
    await user.type(screen.getByLabelText('소유자'), '아내')
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      bank: 'woori',
      type: 'housing_subscription',
      accountNumber: '1002-123-456789',
    })
  })

  it('수정 시 기존 유형을 보여주되 바꿀 수 없다', () => {
    const account = fromApiAccount({
      number: '123-456',
      owner: '남편',
      bank: 'woori',
      nickname: '청약',
      type: 'housing_subscription',
    })
    render(
      <AccountFormModal
        open
        account={account}
        onClose={() => {}}
        onSubmit={vi.fn()}
        loading={false}
      />,
    )

    expect(screen.getByText('주택청약')).toBeInTheDocument()
    expect(screen.getByLabelText('계좌 유형')).toBeDisabled()
    expect(screen.getByText('우리은행')).toBeInTheDocument()
    expect(screen.getByLabelText('금융사')).toBeDisabled()
  })
})
