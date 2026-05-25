import type { Account, AccountApiResponse, AccountOwner, Bank } from '../types/account'

export const BANK_LABELS: Record<Bank, string> = {
  hantu: '한국투자증권',
}

// 백엔드는 {bank, number, owner, nickname}만 보관하므로, 화면용 Account의
// 잔액/통화 등 나머지 필드는 기본값으로 채운다(추후 백엔드 확장 시 정리).
export function fromApiAccount(api: AccountApiResponse): Account {
  return {
    id: `${api.bank}-${api.number}`,
    name: api.nickname ?? api.number,
    bank: BANK_LABELS[api.bank] ?? api.bank,
    accountNumber: api.number,
    currency: 'KRW',
    ownerName: api.owner,
    balance: 0,
    type: '위탁',
    owner: api.owner as AccountOwner,
    positions: 0,
    ytd: 0,
    stocksPct: 0,
    cashPct: 100,
    txCount: 0,
    stripe: 'var(--accent)',
  }
}

// id는 `${bank}-${number}` 형식이고 number에 하이픈이 포함될 수 있으므로,
// 끝에서 accountNumber 길이만큼 잘라 bank 코드를 복원한다.
export function apiIdentity(account: Account): { bank: string; number: string } {
  const number = account.accountNumber
  const bank = account.id.slice(0, account.id.length - number.length - 1)
  return { bank, number }
}
