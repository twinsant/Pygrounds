import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Alert, ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { LANGUAGE_STORAGE_KEY, normalizeLanguage, resolveLanguage, translate } from '../lib/i18n'

const LanguageContext = createContext(null)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')
  const [errorKey, setErrorKey] = useState('')
  const current = useRef('en')
  const preference = useRef(null)
  // Long-lived editor/terminal callbacks must use the latest language too.
  const t = useCallback((key, values) => translate(current.current, key, values), [])

  const apply = useCallback((next) => {
    const resolved = resolveLanguage(next, navigator.languages?.length ? navigator.languages : [navigator.language])
    current.current = resolved
    document.documentElement.lang = resolved
    setLanguage(resolved)
  }, [])

  useEffect(() => {
    try {
      preference.current = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    } catch (error) {
      console.warn('Language preference could not be read.', error)
      setErrorKey('language.readError')
    }
    apply(preference.current)
    function onStorage(event) {
      if ((event.key === LANGUAGE_STORAGE_KEY || event.key === null) && event.storageArea === localStorage) {
        preference.current = event.newValue
        apply(event.newValue)
      }
    }
    function onBrowserLanguage() {
      if (!normalizeLanguage(preference.current)) apply(null)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('languagechange', onBrowserLanguage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('languagechange', onBrowserLanguage)
    }
  }, [apply])

  function changeLanguage(next) {
    if (!Object.hasOwn(messagesByLanguage, next)) throw new Error(`Unsupported language: ${next}`)
    preference.current = next
    apply(next)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
      setErrorKey('')
    } catch (error) {
      console.warn('Language preference could not be saved.', error)
      setErrorKey('language.saveError')
    }
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      <ConfigProvider locale={messagesByLanguage[language]}>
        {errorKey && <Alert className="theme-notice" type="warning" title={t(errorKey)}
          role="status" closable onClose={() => setErrorKey('')} />}
        {children}
      </ConfigProvider>
    </LanguageContext.Provider>
  )
}

const messagesByLanguage = { en: enUS, 'zh-CN': zhCN }
