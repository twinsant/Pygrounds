import en from './locales/en'
import zhCN from './locales/zh-CN'

export const LANGUAGE_STORAGE_KEY = 'pygrounds-language'
export const messages = { en, 'zh-CN': zhCN }

export function normalizeLanguage(value) {
  if (typeof value !== 'string') return null
  const language = value.toLowerCase().replaceAll('_', '-')
  if (language === 'zh' || language.startsWith('zh-')) return 'zh-CN'
  if (language === 'en' || language.startsWith('en-')) return 'en'
  return null
}

export function resolveLanguage(preference, browserLanguages = []) {
  for (const value of [preference, ...browserLanguages]) {
    const language = normalizeLanguage(value)
    if (language) return language
  }
  return 'en'
}

export function translate(language, key, values = {}) {
  const text = messages[normalizeLanguage(language) ?? 'en'][key]
  if (typeof text !== 'string') throw new Error(`Missing translation: ${key}`)
  return text.replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.hasOwn(values, name)) throw new Error(`Missing translation value: ${key}.${name}`)
    return String(values[name])
  })
}

export class LocalizedError extends Error {
  constructor(key, values = {}) {
    super(translate('en', key, values))
    this.translationKey = key
    this.translationValues = values
  }
}

export function errorMessage(error, t, fallback = 'error.unexpected') {
  if (!error) return ''
  if (error.translationKey) return t(error.translationKey, error.translationValues)
  if (error.message) return t('error.detail', { detail: error.message })
  return t(fallback)
}
