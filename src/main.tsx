import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import { RouterProvider } from 'react-router-dom'
import theme from './styles/theme.ts'
import './styles/global.css'
import router from './router/index.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={theme} locale={koKR}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
)
