import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography } from 'antd'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { apiClient } from '../api/index.ts'
import { LOGIN_URL } from '../api/client.ts'
import { useAuthStore } from '../stores/authStore.ts'
import { useUiStore } from '../stores/uiStore.ts'

const { Title } = Typography

interface GoogleIdTokenPayload {
  sub: string
  email: string
  name: string
}

// 서버가 Google ID Token을 검증하고 발급하는 세션. 이후 API 인증은 이 토큰으로 한다
// (Google ID Token은 1시간이면 만료되지만, 세션은 접속할 때마다 연장된다).
interface SessionResponse {
  token: string
  email: string
  expires_at: string
}

function decodeGoogleIdToken(token: string): GoogleIdTokenPayload {
  const [, payload] = token.split('.')
  if (!payload) throw new Error('Malformed JWT')
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const json = decodeURIComponent(
    atob(padded)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  )
  return JSON.parse(json) as GoogleIdTokenPayload
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const showToast = useUiStore((s) => s.showToast)
  const [loading, setLoading] = useState(false)

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      showToast({
        message: 'Google 인증 정보를 받지 못했습니다.',
        type: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const credential = credentialResponse.credential
      const payload = decodeGoogleIdToken(credential)
      const { data } = await apiClient.post<SessionResponse>(LOGIN_URL, {
        id_token: credential,
      })
      setAuth(
        { id: payload.sub, email: data.email, name: payload.name },
        data.token,
      )
      navigate('/', { replace: true })
    } catch {
      showToast({
        message: '로그인에 실패했습니다. 다시 시도해주세요.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleError = () => {
    showToast({ message: 'Google 로그인에 실패했습니다.', type: 'error' })
  }

  return (
    <Card style={{ textAlign: 'center' }}>
      <Title level={3} style={{ marginBottom: 32 }}>
        Retirel
      </Title>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: loading ? 'none' : 'auto',
        }}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          size="large"
          width="300"
        />
      </div>
    </Card>
  )
}
