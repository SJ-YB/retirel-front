import type { AllocationSlice } from '../../types/dashboard'
import type { AllocationResponse } from '../../types/networth'
import type { AssetClass } from '../../types/watchlist'

export const ASSET_CLASS_META: Record<
  AssetClass,
  { label: string; color: string }
> = {
  stock: { label: '주식', color: 'var(--accent)' },
  bond: { label: '채권', color: 'var(--sky)' },
  commodity: { label: '금·원자재', color: 'var(--violet)' },
  cash: { label: '현금성', color: 'var(--emerald)' },
  other: { label: '기타', color: 'var(--rose)' },
}

export const ASSET_CLASS_ORDER: AssetClass[] = [
  'stock',
  'bond',
  'commodity',
  'cash',
  'other',
]

/** 자산군별 평가액을 도넛 조각(비중 %)으로 바꾼다. 백엔드 순서(평가액 내림차순)를 따른다. */
export function toSlices(allocation: AllocationResponse): AllocationSlice[] {
  const total = Number(allocation.total_krw)
  if (!(total > 0)) return []
  return allocation.classes.map((c) => ({
    key: c.asset_class,
    label: ASSET_CLASS_META[c.asset_class].label,
    pct: (Number(c.value_krw) / total) * 100,
    color: ASSET_CLASS_META[c.asset_class].color,
  }))
}

/** 특정 자산군의 원화 평가액. 없으면 0. */
export function valueOf(
  allocation: AllocationResponse,
  assetClass: AssetClass,
): number {
  const found = allocation.classes.find((c) => c.asset_class === assetClass)
  return found ? Number(found.value_krw) : 0
}

export interface ContributionPlan {
  // 현재 채권 비중(%)
  currentPct: number
  // 목표 비중 대비 채권 과부족(원). 양수면 채권이 부족하다.
  gap: number
  // 이번 달 적립액 가운데 채권에 넣을 금액과 나머지(주식 등)에 넣을 금액
  bondBuy: number
  otherBuy: number
  // 위처럼 사고 난 뒤의 채권 비중(%)
  afterPct: number
  // 매도 없이 목표 비중에 닿으려면 한쪽만 얼마나 더 사야 하는지(원).
  // 채권이 부족하면 채권을, 넘치면 채권 외 자산을 산다. 이미 목표면 0.
  toReach: number
  toReachSide: 'bond' | 'other' | null
}

/**
 * 매도 없이 적립 매수만으로 채권 비중을 목표에 가깝게 맞추는 배분.
 *
 * 적립 후 총액(T + C)의 목표 비중만큼이 채권이 되도록 채권 매수액을 정하고,
 * 0 ~ C 범위로 자른다. 채권이 넘치면 전액을 채권 외 자산에, 크게 부족하면 전액을
 * 채권에 넣는다.
 */
export function planContribution({
  total,
  bond,
  targetPct,
  contribution,
}: {
  total: number
  bond: number
  targetPct: number
  contribution: number
}): ContributionPlan {
  const t = Math.min(Math.max(targetPct, 0), 100) / 100
  const c = Math.max(contribution, 0)
  const ideal = t * (total + c) - bond
  const bondBuy = Math.min(Math.max(ideal, 0), c)
  const otherBuy = c - bondBuy
  const after = total + c

  let toReach = 0
  let toReachSide: ContributionPlan['toReachSide'] = null
  const deficit = t * total - bond
  if (deficit > 0 && t < 1) {
    // (B + X) / (T + X) = t
    toReach = deficit / (1 - t)
    toReachSide = 'bond'
  } else if (deficit < 0 && t > 0) {
    // B / (T + X) = t
    toReach = bond / t - total
    toReachSide = 'other'
  }

  return {
    currentPct: total > 0 ? (bond / total) * 100 : 0,
    gap: deficit,
    bondBuy,
    otherBuy,
    afterPct: after > 0 ? ((bond + bondBuy) / after) * 100 : 0,
    toReach,
    toReachSide,
  }
}
