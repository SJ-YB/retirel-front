import { Segmented } from 'antd'

// 계좌 등록 화면에서 고르는 계좌 종류. 대출도 계좌이므로 같은 진입점에서 등록한다.
export type AccountKind = 'brokerage' | 'loan'

const OPTIONS: { value: AccountKind; label: string }[] = [
  { value: 'brokerage', label: '증권 계좌' },
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
