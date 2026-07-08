import type { AppInfo } from '@/types/app'

export const APP_ID = `${process.env.APP_KEY}` // kept for legacy API routes
export const API_KEY = `${process.env.APP_KEY}`
export const API_URL = `${process.env.API_URL}`

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48

export type AppTypeValue = 'chat' | 'agent'

/** Fallback app info — actual info is fetched at runtime via /v1/meta */
export const APP_INFO: AppInfo = {
  title: 'Chat APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'en',

}
