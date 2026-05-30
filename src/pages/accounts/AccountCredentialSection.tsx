import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Input,
  Popconfirm,
  Radio,
  Space,
  Spin,
  Typography,
} from 'antd'
import axios from 'axios'

import { apiClient } from '../../api'
import { useUiStore } from '../../stores'
import type {
  BrokerageCredentialRequest,
  BrokerageEnvironment,
  CredentialStatusResponse,
} from '../../types/account'

interface AccountCredentialSectionProps {
  bank: string
  number: string
}

const ENV_LABEL: Record<BrokerageEnvironment, string> = {
  real: '실전투자',
  paper: '모의투자',
}

/**
 * 계좌의 증권사 Open API 자격증명(App Key/Secret) 연동 섹션.
 *
 * 보안 원칙:
 * - 비밀은 컴포넌트 로컬 state에만 일시 보관하고, 저장/해제 직후 즉시 비운다.
 *   store/localStorage에는 절대 저장하지 않는다.
 * - 서버는 비밀을 다시 돌려주지 않으므로 입력칸을 prefill하지 않는다.
 * - autoComplete를 꺼 브라우저가 비밀을 저장하지 못하게 한다.
 */
function AccountCredentialSection({
  bank,
  number,
}: AccountCredentialSectionProps) {
  const { showToast } = useUiStore()
  const [status, setStatus] = useState<CredentialStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [environment, setEnvironment] = useState<BrokerageEnvironment>('real')

  const basePath = `/v1/accounts/${encodeURIComponent(bank)}/${encodeURIComponent(
    number,
  )}/credentials`

  const clearSecrets = () => {
    setAppKey('')
    setAppSecret('')
  }

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<CredentialStatusResponse>(basePath)
      setStatus(data)
      if (data.environment) setEnvironment(data.environment)
    } catch {
      // 상태 조회 실패는 치명적이지 않다. 미연동으로 간주하고 계속 진행한다.
      setStatus({ registered: false, environment: null, updated_at: null })
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleSave = async () => {
    if (!appKey.trim() || !appSecret.trim()) {
      showToast({
        message: 'App Key와 App Secret을 모두 입력해주세요',
        type: 'error',
      })
      return
    }
    setSaving(true)
    try {
      const payload: BrokerageCredentialRequest = {
        app_key: appKey.trim(),
        app_secret: appSecret.trim(),
        environment,
      }
      await apiClient.put(basePath, payload)
      clearSecrets() // 전송 직후 메모리에서 비운다
      showToast({ message: 'API 연동이 저장되었습니다', type: 'success' })
      await fetchStatus()
    } catch (err) {
      const httpStatus = axios.isAxiosError(err)
        ? err.response?.status
        : undefined
      const message =
        httpStatus === 400
          ? '유효하지 않은 자격증명입니다. App Key/Secret을 확인해주세요'
          : httpStatus === 502
            ? '증권사 검증에 실패했습니다. 잠시 후 다시 시도해주세요'
            : httpStatus === 404
              ? '계좌를 찾을 수 없습니다'
              : 'API 연동 저장에 실패했습니다'
      showToast({ message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await apiClient.delete(basePath)
      clearSecrets()
      showToast({ message: 'API 연동이 해제되었습니다', type: 'success' })
      await fetchStatus()
    } catch {
      showToast({ message: 'API 연동 해제에 실패했습니다', type: 'error' })
    } finally {
      setRemoving(false)
    }
  }

  const registered = status?.registered ?? false

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        한국투자증권 API 연동
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        거래내역 자동 연동을 위해 한국투자증권에서 발급한 App Key와 App Secret을
        입력하세요. 입력한 값은 암호화되어 서버에 안전하게 저장되며 다시
        표시되지 않습니다.
      </Typography.Paragraph>

      {loading ? (
        <Spin size="small" />
      ) : (
        <>
          <Alert
            type={registered ? 'success' : 'info'}
            showIcon
            style={{ marginBottom: 12 }}
            message={
              registered
                ? `연동됨 · ${
                    status?.environment ? ENV_LABEL[status.environment] : ''
                  }`
                : '아직 연동되지 않았습니다'
            }
          />

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Radio.Group
              value={environment}
              onChange={(e) =>
                setEnvironment(e.target.value as BrokerageEnvironment)
              }
            >
              <Radio value="real">실전투자</Radio>
              <Radio value="paper">모의투자</Radio>
            </Radio.Group>

            <Input.Password
              placeholder={
                registered ? '새 App Key (변경 시에만 입력)' : 'App Key'
              }
              autoComplete="new-password"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
            />
            <Input.Password
              placeholder={
                registered ? '새 App Secret (변경 시에만 입력)' : 'App Secret'
              }
              autoComplete="new-password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
            />

            <Space>
              <Button type="primary" loading={saving} onClick={handleSave}>
                {registered ? '연동 갱신' : '연동 저장'}
              </Button>
              {registered && (
                <Popconfirm
                  title="API 연동 해제"
                  description="저장된 App Key/Secret을 삭제합니다. 계속하시겠습니까?"
                  okText="해제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleRemove}
                >
                  <Button danger loading={removing}>
                    연동 해제
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Space>
        </>
      )}
    </div>
  )
}

export default AccountCredentialSection
