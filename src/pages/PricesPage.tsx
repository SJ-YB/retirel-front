import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from 'antd'

import { apiClient } from '../api'
import { useUiStore } from '../stores'
import { useIsMobile } from '../hooks/useIsMobile'
import { fmt } from '../utils/format'
import type {
  CollectStatusResponse,
  DailyCloseSeriesResponse,
  LatestPriceResponse,
} from '../types/price'
import type { Market } from '../types/watchlist'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import PriceChart from '../components/charts/PriceChart'
import type { PricePoint } from '../components/charts/PriceChart'

const MARKET_LABEL: Record<Market, string> = {
  krx: 'KRX',
  nas: 'NAS',
  nys: 'NYS',
  ams: 'AMS',
}

// 차트에서 볼 구간. 백엔드는 폐구간 필터만 받으므로 여기서 시작일을 계산한다.
const RANGES = [
  { key: '1m', label: '1M', days: 30 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: null },
] as const

type RangeKey = (typeof RANGES)[number]['key']

// 수집이 끝났는지 확인하는 폴링 주기와 상한. 최초 백필은 종목 수만큼 증권사
// API를 반복 호출해 몇 분이 걸릴 수 있어, 무한정 기다리지는 않는다.
const POLL_INTERVAL_MS = 3000
const POLL_LIMIT = 100

function priceKey(market: Market, ticker: string): string {
  return `${market}:${ticker}`
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startDateOf(range: RangeKey): string | null {
  const days = RANGES.find((r) => r.key === range)?.days
  if (days == null) return null
  const from = new Date()
  from.setDate(from.getDate() - days)
  return toIsoDate(from)
}

/** 전일 대비 등락률(%). 둘 중 하나라도 없거나 기준이 0이면 계산하지 않는다. */
function changeRate(
  close: string | null,
  previous: string | null,
): number | null {
  if (close == null || previous == null) return null
  const now = Number(close)
  const before = Number(previous)
  if (!Number.isFinite(now) || !Number.isFinite(before) || before === 0) {
    return null
  }
  return ((now - before) / before) * 100
}

function LatestPriceRow({
  price,
  selected,
  onSelect,
}: {
  price: LatestPriceResponse
  selected: boolean
  onSelect: () => void
}) {
  const rate = changeRate(price.close, price.previous_close)
  const rateColor =
    rate == null ? 'var(--text-3)' : rate >= 0 ? 'var(--pos)' : 'var(--neg)'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 10px',
        textAlign: 'left',
        borderTop: '1px solid var(--border)',
        borderRadius: 8,
        background: selected ? 'var(--surface-hi)' : 'transparent',
        color: 'var(--text)',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          padding: '3px 8px',
          borderRadius: 4,
          background: 'var(--accent-dim)',
          color: 'var(--accent-hi)',
          flexShrink: 0,
        }}
      >
        {MARKET_LABEL[price.market]}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="mono" style={{ fontSize: 14 }}>
          {price.ticker}
        </div>
        {price.name && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {price.name}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 13 }}>
          {price.close == null
            ? '—'
            : fmt.money(Number(price.close), price.currency)}
        </div>
        <div className="mono" style={{ fontSize: 11, color: rateColor }}>
          {rate == null
            ? price.close == null
              ? '미수집'
              : '—'
            : fmt.pct(rate)}
        </div>
      </div>
    </button>
  )
}

/**
 * 관찰 종목의 일별 종가를 보는 화면.
 *
 * 수집 잡이 적재해 둔 값만 읽는다. 종목을 고르면 그 종목의 종가 시계열을
 * 구간별로 보여주고, 상단 버튼으로 수집을 지금 한 번 돌릴 수 있다.
 */
function PricesPage() {
  const { showToast } = useUiStore()
  const isMobile = useIsMobile()

  const [latest, setLatest] = useState<LatestPriceResponse[]>([])
  const [loadingLatest, setLoadingLatest] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const [series, setSeries] = useState<DailyCloseSeriesResponse | null>(null)
  const [loadingSeries, setLoadingSeries] = useState(false)
  const [range, setRange] = useState<RangeKey>('6m')

  const [collecting, setCollecting] = useState(false)

  const selected = useMemo(
    () =>
      latest.find(
        (price) => priceKey(price.market, price.ticker) === selectedKey,
      ) ?? null,
    [latest, selectedKey],
  )

  const fetchLatest = useCallback(async () => {
    setLoadingLatest(true)
    try {
      const { data } =
        await apiClient.get<LatestPriceResponse[]>('/v1/prices/latest')
      setLatest(data)
      // 아직 고른 종목이 없으면 첫 종목을 자동으로 연다(빈 화면 방지).
      setSelectedKey((current) => {
        if (
          current &&
          data.some((p) => priceKey(p.market, p.ticker) === current)
        ) {
          return current
        }
        return data.length > 0 ? priceKey(data[0].market, data[0].ticker) : null
      })
    } catch {
      showToast({ message: '종가를 불러오지 못했습니다', type: 'error' })
    } finally {
      setLoadingLatest(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  useEffect(() => {
    if (!selected) {
      setSeries(null)
      return
    }

    // 응답이 늦게 도착한 이전 종목의 시계열이 화면을 덮어쓰지 않도록 버린다.
    let stale = false
    const load = async () => {
      setLoadingSeries(true)
      try {
        const start = startDateOf(range)
        const { data } = await apiClient.get<DailyCloseSeriesResponse>(
          `/v1/prices/${encodeURIComponent(selected.market)}/${encodeURIComponent(
            selected.ticker,
          )}`,
          { params: start ? { start } : {} },
        )
        if (!stale) setSeries(data)
      } catch {
        if (!stale) {
          setSeries(null)
          showToast({
            message: '종가 시계열을 불러오지 못했습니다',
            type: 'error',
          })
        }
      } finally {
        if (!stale) setLoadingSeries(false)
      }
    }
    load()
    return () => {
      stale = true
    }
  }, [selected, range, showToast])

  const handleCollect = async () => {
    try {
      const { data } =
        await apiClient.post<CollectStatusResponse>('/v1/prices/collect')
      showToast({
        message: data.started
          ? '종가 수집을 시작했습니다'
          : '이미 수집이 진행 중입니다',
        type: 'info',
      })
      // 새로 시작했든 이미 돌고 있든, 끝날 때까지 지켜본다.
      setCollecting(true)
    } catch {
      showToast({ message: '수집 요청에 실패했습니다', type: 'error' })
    }
  }

  // 수집은 비동기(202)라 응답만으로는 끝났는지 알 수 없다. 끝날 때까지 상태를
  // 폴링하고, 끝나면 목록을 다시 읽어 새로 들어온 종가를 화면에 반영한다.
  // 화면을 떠나면 폴링도 멈춘다(언마운트된 컴포넌트 갱신 방지).
  useEffect(() => {
    if (!collecting) return

    let cancelled = false
    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      try {
        const { data } =
          await apiClient.get<CollectStatusResponse>('/v1/prices/collect')
        if (cancelled) return
        // 상한에 닿으면 폴링을 접는다. 수집 자체는 서버에서 계속 진행되며,
        // 사용자가 화면을 다시 열면 그때 적재된 값이 보인다.
        if (!data.running || attempts >= POLL_LIMIT) {
          setCollecting(false)
          await fetchLatest()
        }
      } catch {
        if (!cancelled) setCollecting(false)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [collecting, fetchLatest])

  const points: PricePoint[] = useMemo(
    () =>
      (series?.points ?? [])
        .map((point) => ({ date: point.date, close: Number(point.close) }))
        .filter((point) => Number.isFinite(point.close)),
    [series],
  )

  const collectedCount = latest.filter((price) => price.close != null).length

  return (
    <>
      <PageHeader
        title="Prices"
        meta={`${latest.length} stocks · ${collectedCount} collected · 일별 종가`}
        right={
          <Button loading={collecting} onClick={handleCollect}>
            <Icon name="refresh" size={14} /> 수집
          </Button>
        }
      />

      <div
        style={{
          padding: isMobile ? '0 18px 100px' : '0 28px 32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: 16,
        }}
      >
        <div
          className="card"
          style={{
            padding: 14,
            width: isMobile ? '100%' : 320,
            flexShrink: 0,
          }}
        >
          <div
            className="label-caps"
            style={{ marginBottom: 6, padding: '0 6px' }}
          >
            WATCHED
          </div>
          {loadingLatest && latest.length === 0 ? (
            <div
              style={{
                padding: 22,
                textAlign: 'center',
                color: 'var(--text-3)',
              }}
            >
              종가를 불러오는 중...
            </div>
          ) : latest.length === 0 ? (
            <div
              style={{
                padding: 22,
                textAlign: 'center',
                color: 'var(--text-3)',
              }}
            >
              관찰 종목이 없습니다. Watchlist에서 먼저 등록하세요
            </div>
          ) : (
            latest.map((price) => {
              const key = priceKey(price.market, price.ticker)
              return (
                <LatestPriceRow
                  key={key}
                  price={price}
                  selected={key === selectedKey}
                  onSelect={() => setSelectedKey(key)}
                />
              )
            })
          )}
        </div>

        <div
          className="card"
          style={{ padding: 18, flex: 1, minWidth: 0, width: '100%' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 15 }}>
                {selected ? selected.ticker : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {selected?.name ??
                  (selected
                    ? MARKET_LABEL[selected.market]
                    : '종목을 선택하세요')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {RANGES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  aria-pressed={range === option.key}
                  className="mono"
                  style={{
                    fontSize: 11,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background:
                      range === option.key
                        ? 'var(--accent-dim)'
                        : 'transparent',
                    color:
                      range === option.key
                        ? 'var(--accent-hi)'
                        : 'var(--text-3)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loadingSeries && points.length === 0 ? (
            <div
              style={{
                padding: 60,
                textAlign: 'center',
                color: 'var(--text-3)',
              }}
            >
              불러오는 중...
            </div>
          ) : points.length < 2 ? (
            <div
              style={{
                padding: 60,
                textAlign: 'center',
                color: 'var(--text-3)',
              }}
            >
              {selected
                ? '이 구간에 적재된 종가가 없습니다. 수집을 먼저 실행하세요'
                : '관찰 종목을 선택하면 종가 추이를 보여줍니다'}
            </div>
          ) : (
            <PriceChart
              points={points}
              currency={series?.currency ?? 'KRW'}
              height={isMobile ? 240 : 320}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default PricesPage
