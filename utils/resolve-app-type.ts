import type { Locale } from '@/i18n'
import { i18n as i18nConfig } from '@/i18n'

/**
 * Maps a Dify `default_language` string (e.g. `"zh-Hans"`, `"en-US"`)
 * to the app's supported Locale type.  Returns `null` if the language is
 * unrecognised or already the default locale.
 */
export function difyLocaleToAppLocale(difyLang: string): Locale | null {
  const lower = difyLang.toLowerCase()
  let locale: Locale | null = null
  if (lower === 'zh-hans' || lower === 'zh_hans' || lower.startsWith('zh'))
    locale = 'zh-Hans'
  else if (lower.startsWith('en'))
    locale = 'en'
  return locale && locale !== i18nConfig.defaultLocale ? locale : null
}
