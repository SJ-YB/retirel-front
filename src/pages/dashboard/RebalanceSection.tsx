import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { InputNumber } from 'antd'
import { Link } from 'react-router-dom'

import type { AllocationResponse } from '../../types/networth'
import { fmt } from '../../utils/format'
import { ASSET_CLASS_META, planContribution, valueOf } from './allocation'

// 목표 비중과 월 적립액은 이 브라우저에만 저장한다(민감하지 않은 개인 설정).
const TARGET_KEY = 'retirel.allocation.targetBondPct'
const CONTRIBUTION_KEY = 'retirel.allocation.monthlyContribution'
const DEFAULT_TARGET_PCT = 15

function readNumber(key: string, fallback: number | null): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function writeNumber(key: string, value: number | null) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, String(value))
  } catch {
    // 저장소를 쓸 수 없으면(사파리 사생활 보호 등) 이번 화면에서만 기억한다.
  }
}

function Stat({
  label,
  value,
  footer,
  testId,
}: {
  label: string
  value: ReactNode
  footer?: ReactNode
  testId: string
}) {
  return (
    <div
      data-testid={testId}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
      }}
    >
      <div className="label-caps" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 15 }}>
        {value}
      </div>
      {footer && (
        <div
          className="mono"
          style={{ fontSize: 11, marginTop: 2, color: 'var(--text-2)' }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

interface RebalanceSectionProps {
  allocation: AllocationResponse | null
  isMobile: boolean
}

/**
 * 채권 목표 비중 대비 현재 위치와, 이번 달 적립액을 채권/그 외로 어떻게 나눌지.
 *
 * 매도 없이 매수만으로 맞추는 계산이다. 적립 후 총액의 목표 비중만큼이 채권이
 * 되도록 채권 매수액을 정하고 나머지를 주식 등에 배분한다.
 */
function RebalanceSection({ allocation, isMobile }: RebalanceSectionProps) {
  const [targetPct, setTargetPct] = useState<number | null>(() =>
    readNumber(TARGET_KEY, DEFAULT_TARGET_PCT),
  )
  const [contribution, setContribution] = useState<number | null>(() =>
    readNumber(CONTRIBUTION_KEY, null),
  )

  useEffect(() => writeNumber(TARGET_KEY, targetPct), [targetPct])
  useEffect(() => writeNumber(CONTRIBUTION_KEY, contribution), [contribution])

  const total = allocation ? Number(allocation.total_krw) : 0
  const bond = allocation ? valueOf(allocation, 'bond') : 0
  const target = targetPct ?? DEFAULT_TARGET_PCT

  const plan = useMemo(
    () =>
      planContribution({
        total,
        bond,
        targetPct: target,
        contribution: contribution ?? 0,
      }),
    [total, bond, target, contribution],
  )

  const bondHoldings = allocation
    ? allocation.holdings.filter((h) => h.asset_class === 'bond')
    : []
  const gapLabel =
    Math.abs(plan.gap) < 1
      ? '목표와 같음'
      : plan.gap > 0
        ? `채권 ${fmt.krwShort(plan.gap)} 부족`
        : `채권 ${fmt.krwShort(-plan.gap)} 초과`

  return (
    <div className="card" style={{ padding: 20 }} aria-label="채권 비중 맞추기">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="serif" style={{ fontSize: 18 }}>
            채권 비중 맞추기
          </div>
          <div className="label-caps" style={{ marginTop: 4 }}>
            REBALANCE · MONTHLY CONTRIBUTION
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
            }}
          >
            <span className="muted">목표 채권</span>
            <InputNumber<number>
              aria-label="목표 채권 비중"
              min={0}
              max={100}
              precision={1}
              value={targetPct}
              onChange={(v) => setTargetPct(v)}
              suffix="%"
              style={{ width: 92 }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
            }}
          >
            <span className="muted">이번 달 적립</span>
            <InputNumber<number>
              aria-label="이번 달 적립액"
              placeholder="금액(원)"
              min={0}
              precision={0}
              value={contribution}
              onChange={(v) => setContribution(v)}
              formatter={(value) =>
                value ? Number(value).toLocaleString('en-US') : ''
              }
              parser={(value) => Number((value ?? '').replace(/[^\d]/g, ''))}
              style={{ width: 150 }}
            />
          </label>
        </div>
      </div>

      {!allocation || total <= 0 ? (
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          평가된 보유 종목이 없어 비중을 계산할 수 없습니다.
        </div>
      ) : (
        <>
          {/* 현재 채권 비중 막대 + 목표 표시 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                position: 'relative',
                height: 10,
                borderRadius: 5,
                background: 'var(--surface-hi)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(plan.currentPct, 100)}%`,
                  height: '100%',
                  background: ASSET_CLASS_META.bond.color,
                }}
              />
            </div>
            <div style={{ position: 'relative', height: 16 }}>
              <div
                title={`목표 ${target}%`}
                style={{
                  position: 'absolute',
                  left: `${Math.min(target, 100)}%`,
                  top: -14,
                  width: 2,
                  height: 18,
                  background: 'var(--text)',
                  transform: 'translateX(-1px)',
                }}
              />
            </div>
            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-2)',
              }}
            >
              <span>채권 {plan.currentPct.toFixed(1)}%</span>
              <span>목표 {target.toFixed(1)}%</span>
            </div>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Stat
              testId="rebalance-current"
              label="현재 채권"
              value={fmt.krwShort(bond)}
              footer={`증권 ${fmt.krwShort(total)} 중 ${plan.currentPct.toFixed(1)}%`}
            />
            <Stat
              testId="rebalance-gap"
              label="목표 대비"
              value={gapLabel}
              footer={`목표 ${fmt.krwShort((target / 100) * total)}`}
            />
            <Stat
              testId="rebalance-reach"
              label="매수만으로 맞추려면"
              value={
                plan.toReachSide == null
                  ? '—'
                  : `${plan.toReachSide === 'bond' ? '채권' : '주식 등'} ${fmt.krwShort(plan.toReach)}`
              }
              footer={
                plan.toReachSide == null
                  ? '이미 목표 비중'
                  : `${plan.toReachSide === 'bond' ? '채권' : '채권 외 자산'}만 이만큼 사면 ${target}%`
              }
            />
            <Stat
              testId="rebalance-plan"
              label="이번 달 배분"
              value={
                contribution
                  ? `채권 ${fmt.won(plan.bondBuy)}`
                  : '적립액을 입력하세요'
              }
              footer={
                contribution
                  ? `주식 등 ${fmt.won(plan.otherBuy)} → 채권 ${plan.afterPct.toFixed(1)}%`
                  : undefined
              }
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {bondHoldings.length > 0 ? (
              <>
                보유 채권 종목:{' '}
                {bondHoldings.map((h, i) => (
                  <span key={`${h.market}:${h.ticker}`}>
                    {i > 0 && ' · '}
                    <span className="mono">{h.name ?? h.ticker}</span>{' '}
                    <span className="muted">
                      {fmt.krwShort(Number(h.value_krw))}
                    </span>
                  </span>
                ))}
              </>
            ) : (
              <>채권으로 지정된 보유 종목이 없습니다.</>
            )}{' '}
            <Link to="/watchlist" style={{ color: 'var(--accent-hi)' }}>
              자산군 지정하기 →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default RebalanceSection
