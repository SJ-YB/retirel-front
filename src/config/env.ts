function requireEnv(key: string): string {
  const value = import.meta.env[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `[env] 필수 환경변수 ${key} 가 설정되지 않았습니다. .env 파일 또는 배포 환경변수를 확인하세요.`,
    )
  }
  return value
}

export const ENV = {
  API_BASE_URL: requireEnv('VITE_API_BASE_URL'),
  APP_ENV: requireEnv('VITE_APP_ENV'),
  GOOGLE_CLIENT_ID: requireEnv('VITE_GOOGLE_CLIENT_ID'),
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const
