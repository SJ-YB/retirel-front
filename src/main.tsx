import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { RouterProvider } from 'react-router-dom'
import { ENV } from './config/env.ts'
import theme from './styles/theme.ts'
import './styles/global.css'
import router from './router/index.tsx'

async function bootstrap() {
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={ENV.GOOGLE_CLIENT_ID}>
        <ConfigProvider theme={theme} locale={koKR}>
          <RouterProvider router={router} />
        </ConfigProvider>
      </GoogleOAuthProvider>
    </StrictMode>,
  )
}

bootstrap()
