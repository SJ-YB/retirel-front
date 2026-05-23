export type Currency = 'KRW' | 'USD'

export type AccountType = '위탁' | '중개' | '예금' | '입출금' | '정기예금' | '해외주식'

export type AccountOwner = '남편' | '아내' | '공동'

export interface Account {
  id: string
  name: string
  bank: string
  accountNumber: string
  currency: Currency
  ownerName: string
  balance: number
  type: AccountType
  owner: AccountOwner
  positions?: number
  ytd?: number
  stocksPct?: number
  cashPct?: number
  txCount?: number
  stripe: string
}

export interface CreateAccountRequest {
  name: string
  bank: string
  accountNumber?: string
  currency?: Currency
  ownerName: string
  type?: AccountType
  owner?: AccountOwner
}

// 백엔드(POST /api/v1/accounts)가 기대하는 계좌 생성 요청 본문.
export type Bank = 'hantu'

export interface CreateAccountApiRequest {
  number: string
  owner_id: string
  bank: Bank
  nickname?: string
}

export interface UpdateAccountRequest {
  name?: string
  type?: AccountType
  owner?: AccountOwner
}
