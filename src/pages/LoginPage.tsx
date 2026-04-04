import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography } from 'antd';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import apiClient from '../api/client.ts';
import { useAuthStore } from '../stores/authStore.ts';
import { useUiStore } from '../stores/uiStore.ts';

const { Title } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const showToast = useUiStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      showToast({ message: 'Google 인증 정보를 받지 못했습니다.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/google', {
        idToken: credentialResponse.credential,
      });
      setAuth(data.user, data.token);
      navigate('/', { replace: true });
    } catch {
      showToast({ message: '로그인에 실패했습니다. 다시 시도해주세요.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    showToast({ message: 'Google 로그인에 실패했습니다.', type: 'error' });
  };

  return (
    <Card style={{ textAlign: 'center' }}>
      <Title level={3} style={{ marginBottom: 32 }}>
        Retirel
      </Title>
      <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: loading ? 'none' : 'auto' }}>
        <GoogleLogin onSuccess={handleSuccess} onError={handleError} size="large" width="300" />
      </div>
    </Card>
  );
}
