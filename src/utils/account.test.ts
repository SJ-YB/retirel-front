import { describe, expect, it } from 'vitest'

import { apiIdentity, fromApiAccount, toApiAccountType } from './account'
import type { AccountApiResponse } from '../types/account'

function apiAccount(
  overrides: Partial<AccountApiResponse> = {},
): AccountApiResponse {
  return {
    number: '123-456',
    owner: '남편',
    bank: 'hantu',
    nickname: '메인',
    type: 'brokerage',
    ...overrides,
  }
}

describe('fromApiAccount', () => {
  it('증권 계좌를 위탁으로 표기한다', () => {
    expect(fromApiAccount(apiAccount({ type: 'brokerage' })).type).toBe('위탁')
  })

  it('주택청약 계좌를 주택청약으로 표기한다', () => {
    expect(
      fromApiAccount(apiAccount({ type: 'housing_subscription' })).type,
    ).toBe('주택청약')
  })

  it('알 수 없는 유형은 증권 계좌로 취급한다', () => {
    const api = apiAccount({
      type: 'unknown' as unknown as AccountApiResponse['type'],
    })
    expect(fromApiAccount(api).type).toBe('위탁')
  })

  it('하이픈이 든 계좌번호로도 bank/number를 복원한다', () => {
    const account = fromApiAccount(apiAccount({ number: '12-34-56' }))
    expect(apiIdentity(account)).toEqual({ bank: 'hantu', number: '12-34-56' })
  })
})

describe('toApiAccountType', () => {
  it('화면 표기를 백엔드 코드로 되돌린다', () => {
    expect(toApiAccountType('위탁')).toBe('brokerage')
    expect(toApiAccountType('주택청약')).toBe('housing_subscription')
  })

  it('백엔드 코드가 없는 표기는 증권 계좌로 취급한다', () => {
    expect(toApiAccountType('정기예금')).toBe('brokerage')
  })
})
