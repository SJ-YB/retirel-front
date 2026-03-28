export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  APP_ENV: import.meta.env.VITE_APP_ENV as string,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const
