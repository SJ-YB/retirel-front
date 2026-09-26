import { Segmented } from 'antd'

// 계좌 등록 화면에서 고르는 계좌 종류. 대출도 계좌이므로 같은 진입점에서 등록한다.
// 'brokerage'는 대출이 아닌 계좌(증권·주택청약 등) 전체를 가리킨다.
// 'brokerage'는 대출이 아닌 계좌(증권·주택청약 등) 전체를 가리킨다.
export type AccountKind = 'brokerage' | 'loan'

const OPTIONS: { value: AccountKind; label: string }[] = [
  { value: 'brokerage', label: '일반 계좌' },
  { value: 'loan', label: '대출' },
]

function AccountKindSwitch({
  value,
  onChange,
}: {
  value: AccountKind
  onChange: (kind: AccountKind) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="label-caps" style={{ marginBottom: 8 }}>
        종류
      </div>
      <Segmented<AccountKind>
        block
        value={value}
        options={OPTIONS}
        onChange={onChange}
        aria-label="계좌 종류"
      />
    </div>
  )
}

export default AccountKindSwitch
