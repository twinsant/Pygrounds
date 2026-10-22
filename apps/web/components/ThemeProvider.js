import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Alert, ConfigProvider, theme as antdTheme } from 'antd'
import { palettes, resolveTheme, THEME_STORAGE_KEY, UI_FONT } from '../lib/theme'
import { useLanguage } from './LanguageProvider'

const ThemeContext = createContext(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export default function ThemeProvider({ children }) {
  const { t } = useLanguage()
  const [mode, setMode] = useState('dark')
  const [error, setError] = useState('')
  const preference = useRef(null)

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)')
    try {
      preference.current = localStorage.getItem(THEME_STORAGE_KEY)
    } catch (err) {
      console.warn('Theme preference could not be read.', err)
      setError('theme.readError')
    }
    function apply(next) {
      const resolved = resolveTheme(next, system.matches)
      document.documentElement.dataset.theme = resolved
      setMode(resolved)
    }
    function onSystemChange() {
      if (!['light', 'dark'].includes(preference.current)) apply(null)
    }
    function onStorage(event) {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        preference.current = event.newValue
        apply(event.newValue)
      }
    }
    apply(preference.current)
    system.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => {
      system.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function toggleTheme() {
    const next = mode === 'dark' ? 'light' : 'dark'
    preference.current = next
    document.documentElement.dataset.theme = next
    setMode(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
      setError('')
    } catch (err) {
      console.warn('Theme preference could not be saved.', err)
      setError('theme.saveError')
    }
  }

  const p = palettes[mode]
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ConfigProvider theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: p.primary,
          colorPrimaryHover: p.primaryHover,
          colorLink: p.accent,
          colorLinkHover: p.accent,
          colorBgBase: p.canvas,
          colorBgLayout: p.canvas,
          colorBgContainer: p.surface,
          colorBgElevated: p.surfaceRaised,
          colorBorder: p.border,
          colorBorderSecondary: p.border,
          colorText: p.text,
          colorTextSecondary: p.muted,
          colorTextPlaceholder: p.muted,
          colorTextDisabled: p.muted,
          colorBgContainerDisabled: p.surfaceRaised,
          fontFamily: UI_FONT,
          borderRadius: 8,
          controlHeight: 32,
        },
        components: {
          Layout: { headerBg: p.surface, footerBg: p.surface, bodyBg: p.canvas },
          Menu: {
            itemBg: 'transparent', subMenuItemBg: p.surface,
            itemColor: p.muted, itemHoverColor: p.text,
            itemSelectedColor: p.accent, itemSelectedBg: p.selection,
            horizontalItemSelectedBg: p.selection, horizontalItemSelectedColor: p.accent,
            activeBarBorderWidth: 0,
          },
          Button: {
            defaultBg: p.surface, defaultColor: p.text, defaultBorderColor: p.border,
            textTextColor: p.text, textTextHoverColor: p.text, textHoverBg: p.surfaceRaised,
            primaryColor: p.onPrimary,
          },
          Input: { colorBgContainer: p.canvas, activeBg: p.canvas, hoverBg: p.canvas },
        },
      }}>
        {error && <Alert className="theme-notice" type="warning" title={t(error)} role="status"
          closable onClose={() => setError('')} />}
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
