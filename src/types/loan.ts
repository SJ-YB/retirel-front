// 백엔드(GET /api/v1/loans)가 반환하는 대출 응답 본문.
// 금액·금리는 부동소수 오차를 피하려고 문자열로 온다. 화면에서 Number()로 바꿔 표시한다.
export interface LoanResponse {
  id: string
  alias: string
  account: string
  principal: string
  interest_rate: string
  balance: string
  maturity_date: string
  created_at: string | null
  updated_at: string | null
}

// 백엔드(POST /api/v1/loans, PUT /api/v1/loans/{id})가 기대하는 대출 등록·수정 요청 본문.
// 수정은 PUT으로 모든 필드를 다시 보낸다.
export interface LoanRequest {
  alias: string
  account: string
  principal: string
  interest_rate: string
  balance: string
  maturity_date: string
}

// 폼이 다루는 값. 숫자 입력은 number로 받고 전송 시 문자열로 바꾼다.
export interface LoanFormValues {
  alias: string
  account: string
  principal: number
  interest_rate: number
  balance: number
  maturity_date: string
}
