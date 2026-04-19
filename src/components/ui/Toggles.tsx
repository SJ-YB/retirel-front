import type { Currency } from '../../types/account'

interface CurrencyToggleProps {
  value: Currency
  onChange: (value: Currency) => void
}

export function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <div className="seg">
      {(['KRW', 'USD'] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={value === c ? 'active' : ''}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export type RangeValue = '1M' | '3M' | '6M' | '1Y' | '전체'

interface RangeToggleProps {
  value: RangeValue
  onChange: (value: RangeValue) => void
  options?: RangeValue[]
}

export function RangeToggle({
  value,
  onChange,
  options = ['1M', '3M', '6M', '1Y', '전체'],
}: RangeToggleProps) {
  return (
    <div className="seg">
      {options.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={value === r ? 'active' : ''}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
