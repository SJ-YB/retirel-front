export type Currency = 'KRW' | 'USD'

export interface Account {
  id: string
  name: string
  bank: string
  accountNumber: string
  currency: Currency
  ownerName: string
  balance: number
}

export interface CreateAccountRequest {
  name: string
  bank: string
  accountNumber?: string
  currency: Currency
  ownerName: string
}

export interface UpdateAccountRequest {
  name: string
}
