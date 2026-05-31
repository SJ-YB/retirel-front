import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Space, Tag, Typography } from 'antd'
import axios from 'axios'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import type { SyncState, SyncStatusResponse } from '../../types/transaction'

interface AccountSyncSectionProps {
  bank: string
  number: string
}

// running 상태일 때만 상태를 다시 조회하는 폴링 주기(ms).
const POLL_INTERVAL_MS = 2000

const STATE_TAG: Record<SyncState, { color: string; label: string }> = {
  idle: { color: 'default', label: '동기화 이력 없음' },
  running: { color: 'processing', label: '동기화 중' },
  succeeded: { color: 'success', label: '완료' },
  failed: { color: 'error', label: '실패' },
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR')
}

/**
 * 계좌의 거래내역 동기화 섹션.
 *
 * - "거래내역 동기화" 버튼은 수동 연동을 시작한다(백엔드는 202로 즉시 응답).
 * - 진행 중(running)에는 일정 주기로 상태를 폴링해 완료/실패를 반영한다.
 * - 자동 연동(백그라운드)은 사용자가 신경 쓸 필요 없지만, 마지막 동기화 시각/
 *   오류는 이 섹션에서 확인할 수 있다.
 */
function AccountSyncSection({ bank, number }: AccountSyncSectionProps) {
  const { showToast } = useUiStore()
  const [status, setStatus] = useState<SyncStatusResponse | null>(null)
  const [triggering, setTriggering] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const basePath = `/v1/accounts/${encodeURIComponent(bank)}/${encodeURIComponent(
    number,
  )}/transactions/sync`

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get<SyncStatusResponse>(basePath)
      setStatus(data)
    } catch {
      // 상태 조회 실패는 치명적이지 않다. 미동기화로 간주하고 계속 진행한다.
      setStatus(null)
    }
  }, [basePath])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // 진행 중일 때만 주기적으로 상태를 다시 조회한다(완료/실패 시 자동 종료).
  const running = status?.state === 'running'
  useEffect(() => {
    if (!running) return
    timerRef.current = setTimeout(() => {
      fetchStatus()
    }, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [running, status, fetchStatus])

  const handleSync = async () => {
    setTriggering(true)
    try {
      const { data } = await apiClient.post<SyncStatusResponse>(basePath)
      setStatus(data)
    } catch (err) {
      const httpStatus = axios.isAxiosError(err)
        ? err.response?.status
        : undefined
      const message =
        httpStatus === 404
          ? '먼저 한국투자증권 API 연동(App Key/Secret)을 등록해주세요'
          : '거래내역 동기화를 시작하지 못했습니다'
      showToast({ message, type: 'error' })
    } finally {
      setTriggering(false)
    }
  }

  const state: SyncState = status?.state ?? 'idle'
  const tag = STATE_TAG[state]
  const lastSyncedAt = formatDateTime(status?.last_synced_at ?? null)

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        거래내역 동기화
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        한국투자증권에서 체결 거래내역을 가져옵니다. 마지막 거래 이후의 내역만
        추가로 받아오며, 자동 연동도 백그라운드에서 주기적으로 동작합니다.
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space size="small" wrap>
          <Tag color={tag.color}>{tag.label}</Tag>
          {lastSyncedAt && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              마지막 동기화 {lastSyncedAt}
            </Typography.Text>
          )}
          {state === 'succeeded' && status?.inserted != null && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              · 신규 {status.inserted}건
            </Typography.Text>
          )}
        </Space>

        {state === 'failed' && status?.last_error && (
          <Alert
            type="error"
            showIcon
            message="마지막 동기화 실패"
            description={status.last_error}
          />
        )}

        <Button
          type="primary"
          loading={triggering || running}
          onClick={handleSync}
        >
          {running ? '동기화 중…' : '거래내역 동기화'}
        </Button>
      </Space>
    </div>
  )
}

export default AccountSyncSection
