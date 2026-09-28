const DAY_MS = 24 * 60 * 60 * 1000

// 만기까지 남은 일수. 오늘이 만기면 0, 지났으면 음수.
export function daysToMaturity(iso: string, today: Date = new Date()): number {
  const maturity = new Date(iso + 'T00:00:00')
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((maturity.getTime() - base.getTime()) / DAY_MS)
}

export function maturityLabel(days: number): string {
  if (days < 0) return `만기 ${-days}일 지남`
  if (days === 0) return '오늘 만기'
  return `D-${days}`
}
