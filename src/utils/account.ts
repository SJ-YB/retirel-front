import type {
  Account,
  AccountApiResponse,
  AccountApiType,
  AccountOwner,
  AccountType,
  Bank,
} from '../types/account'

export const BANK_LABELS: Record<Bank, string> = {
  hantu: '한국투자증권',
  woori: '우리은행',
}

// 증권사 Open API로 거래내역을 연동하는 금융사. 그 외 금융사(우리은행 등)는
// 연동 대신 납입액을 수기로 입력한다.
const LINKED_BANKS: ReadonlySet<string> = new Set<Bank>(['hantu'])

export function isLinkedBank(bank: string): boolean {
  return LINKED_BANKS.has(bank)
}

// 백엔드 계좌 유형 코드 → 화면 표기. 새 유형이 생기면 여기에만 추가한다.
export const ACCOUNT_TYPE_LABELS: Record<AccountApiType, AccountType> = {
  brokerage: '위탁',
  housing_subscription: '주택청약',
}

const DEFAULT_ACCOUNT_TYPE: AccountApiType = 'brokerage'

// 화면 표기 → 백엔드 계좌 유형 코드. 백엔드 코드에 대응하지 않는 표기
// (목 데이터의 '예금' 등)는 기본값인 증권 계좌로 취급한다.
export function toApiAccountType(label: AccountType): AccountApiType {
  const found = (
    Object.entries(ACCOUNT_TYPE_LABELS) as [AccountApiType, AccountType][]
  ).find(([, value]) => value === label)
  return found ? found[0] : DEFAULT_ACCOUNT_TYPE
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
    type:
      ACCOUNT_TYPE_LABELS[api.type] ??
      ACCOUNT_TYPE_LABELS[DEFAULT_ACCOUNT_TYPE],
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
export function apiIdentity(account: Account): {
  bank: string
  number: string
} {
  const number = account.accountNumber
  const bank = account.id.slice(0, account.id.length - number.length - 1)
  return { bank, number }
}
