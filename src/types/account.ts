export type Currency = 'KRW' | 'USD'

export type AccountType =
  | '위탁'
  | '중개'
  | '예금'
  | '입출금'
  | '정기예금'
  | '해외주식'

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

// 백엔드(PATCH /api/v1/accounts/{bank}/{number})가 기대하는 계좌 수정 요청 본문.
export interface UpdateAccountApiRequest {
  nickname: string | null
}

// 백엔드(GET /api/v1/accounts)가 반환하는 계좌 응답 본문.
export interface AccountApiResponse {
  number: string
  owner: string
  bank: Bank
  nickname: string | null
}

export interface UpdateAccountRequest {
  name?: string
  type?: AccountType
  owner?: AccountOwner
}

// 증권사 Open API 운영 환경(실전/모의). 백엔드와 동일한 문자열을 사용한다.
export type BrokerageEnvironment = 'real' | 'paper'

// 백엔드(PUT /api/v1/accounts/{bank}/{number}/credentials) 요청 본문.
// 비밀(app_key/app_secret)은 저장 시점에만 전송하며 어디에도 보관하지 않는다.
export interface BrokerageCredentialRequest {
  app_key: string
  app_secret: string
  environment: BrokerageEnvironment
}

// 백엔드(GET /api/v1/accounts/{bank}/{number}/credentials) 응답 본문.
// 비밀은 절대 포함되지 않으며 등록 여부/환경/갱신시각만 노출된다.
export interface CredentialStatusResponse {
  registered: boolean
  environment: BrokerageEnvironment | null
  updated_at: string | null
}
