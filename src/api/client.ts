import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import { ENV } from '../config/env.ts'
import type { ApiErrorResponse } from '../types/api.ts'
import { useAuthStore } from '../stores/authStore.ts'

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const { status } = error.response

      switch (status) {
        case 401:
          useAuthStore.getState().clearAuth()
          window.location.href = '/auth/login'
          break
        case 403:
          console.error('[API] 403 Forbidden')
          break
        case 404:
          console.error('[API] 404 Not Found:', error.config?.url)
          break
        case 500:
          console.error('[API] 500 Internal Server Error')
          break
        default:
          console.error(`[API] Error ${status}`)
      }
    } else if (error.request) {
      console.error('[API] 네트워크 에러 — 응답 없음')
    } else {
      console.error('[API] 요청 설정 에러:', error.message)
    }

    return Promise.reject(error)
  },
)

export default apiClient
