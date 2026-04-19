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
  currency: Currency
  ownerName: string
  type?: AccountType
  owner?: AccountOwner
}

export interface UpdateAccountRequest {
  name?: string
  type?: AccountType
  owner?: AccountOwner
}
