import { describe, expect, mock, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import {
  getMonacoTheme, getTerminalTheme, palettes, resolveTheme,
  themeBootstrap, themeCss, THEME_STORAGE_KEY,
} from '../lib/theme'

function contrast(foreground, background) {
  const luminance = (hex) => {
    const values = hex.slice(1).match(/../g).map(value => {
      const channel = parseInt(value, 16) / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
  }
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('theme preference', () => {
  test('uses the system until an explicit light or dark preference is saved', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('obsolete', true)).toBe('dark')
    expect(resolveTheme('obsolete', false)).toBe('light')
  })

  test('bootstrap resolves the same persisted mode before hydration', () => {
    for (const preference of [null, 'dark', 'light', 'obsolete']) {
      for (const systemDark of [true, false]) {
        const document = { documentElement: { dataset: {} } }
        const getItem = mock(() => preference)
        runInNewContext(themeBootstrap, {
          document, localStorage: { getItem },
          matchMedia: () => ({ matches: systemDark }),
        })
        expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY)
        expect(document.documentElement.dataset.theme).toBe(resolveTheme(preference, systemDark))
      }
    }
  })

  test('unavailable storage is reported while the system theme remains usable', () => {
    const document = { documentElement: { dataset: {} } }
    const warn = mock()
    runInNewContext(themeBootstrap, {
      document, console: { warn },
      localStorage: { getItem: () => { throw new Error('Storage disabled') } },
      matchMedia: () => ({ matches: false }),
    })
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('unified design tokens', () => {
  test('both modes expose exactly the same semantic tokens', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort())
    for (const [mode, p] of Object.entries(palettes)) {
      expect(themeCss).toContain(`html[data-theme="${mode}"]`)
      expect(themeCss).toContain(`--canvas:${p.canvas}`)
      expect(themeCss).toContain(`--surface-raised:${p.surfaceRaised}`)
      expect(themeCss).toContain(`color-scheme:${mode}`)
    }
  })

  test('Monaco and terminal consume the page palette in each mode', () => {
    for (const [mode, p] of Object.entries(palettes)) {
      const monaco = getMonacoTheme(mode)
      const terminal = getTerminalTheme(mode)
      expect(monaco.base).toBe(mode === 'dark' ? 'vs-dark' : 'vs')
      expect(monaco.colors['editor.background']).toBe(p.canvas)
      expect(monaco.colors['editor.foreground']).toBe(p.text)
      expect(monaco.colors['editorWidget.background']).toBe(p.surface)
      expect(terminal.background).toBe(p.canvas)
      expect(terminal.foreground).toBe(p.text)
      expect(terminal.cursor).toBe(p.accent)
      expect(terminal.selectionBackground).toBe(p.selection)
    }
  })

  test('UI text, secondary text and terminal ANSI colors meet 4.5:1 contrast', () => {
    for (const [mode, p] of Object.entries(palettes)) {
      for (const background of [p.canvas, p.surface, p.surfaceRaised, p.selection]) {
        for (const foreground of [p.text, p.muted, p.accent]) {
          expect(contrast(foreground, background), `${mode} ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5)
        }
      }
      expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.onPrimary, p.primaryHover)).toBeGreaterThanOrEqual(4.5)
      const { background, cursorAccent: _cursorAccent, selectionBackground: _selection, ...colors } = getTerminalTheme(mode)
      for (const foreground of Object.values(colors)) {
        expect(contrast(foreground, background), `${mode} terminal ${foreground}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
