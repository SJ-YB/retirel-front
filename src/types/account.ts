export interface Account {
  id: string
  name: string // 별칭
  bank: string // 금융사
  owner: string // 소유자
  currency: string // 기본 통화
  accountNumber: string
  balance: number
  type: 'CHECKING' | 'SAVINGS' | 'INVESTMENT'
}
