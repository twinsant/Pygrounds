import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  errorMessage, LANGUAGE_STORAGE_KEY, LocalizedError, messages,
  normalizeLanguage, resolveLanguage, translate,
} from '../lib/i18n'
import { AuthError } from '../lib/auth'

const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()

describe('language selection', () => {
  test('normalizes supported Chinese and English variants', () => {
    for (const value of ['zh', 'zh-CN', 'ZH-cn', 'zh_TW', 'zh-Hant']) {
      expect(normalizeLanguage(value)).toBe('zh-CN')
    }
    for (const value of ['en', 'en-US', 'en_GB']) expect(normalizeLanguage(value)).toBe('en')
    for (const value of [null, undefined, '', 'fr', 'english', 'zhx']) expect(normalizeLanguage(value)).toBeNull()
    expect(LANGUAGE_STORAGE_KEY).toBe('pygrounds-language')
  })

  test('saved choice overrides browser preference, then uses first supported browser language', () => {
    expect(resolveLanguage('en', ['zh-CN'])).toBe('en')
    expect(resolveLanguage('zh-CN', ['en-US'])).toBe('zh-CN')
    expect(resolveLanguage(null, ['fr-FR', 'zh-TW', 'en-US'])).toBe('zh-CN')
    expect(resolveLanguage(null, ['en-GB', 'zh-CN'])).toBe('en')
    expect(resolveLanguage('invalid', ['zh-CN'])).toBe('zh-CN')
    expect(resolveLanguage(null, ['fr-FR'])).toBe('en')
    expect(resolveLanguage(null)).toBe('en')
  })
})

describe('bilingual dictionaries', () => {
  test('both languages have identical keys and interpolation parameters', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages['zh-CN']).sort())
    for (const [key, english] of Object.entries(messages.en)) {
      const chinese = messages['zh-CN'][key]
      expect(english.trim().length).toBeGreaterThan(0)
      expect(chinese.trim().length).toBeGreaterThan(0)
      expect(parameters(chinese)).toEqual(parameters(english))
      const values = Object.fromEntries(parameters(english).map(name => [name, `<${name}>`]))
      for (const language of ['en', 'zh-CN']) {
        expect(translate(language, key, values)).not.toMatch(/\{\w+\}/)
      }
    }
  })

  test('all static UI and error keys exist in both dictionaries', () => {
    const files = [
      'pages/index.js', 'components/LanguageProvider.js', 'components/LanguageSelect.js',
      'components/ThemeProvider.js', 'components/ThemeToggle.js', 'components/AgentPanel.js',
      'components/AuthProvider.js', 'components/AuthDialog.js', 'components/AccountControl.js',
      'components/xterm.js', 'lib/auth.js', 'lib/agent.js',
    ]
    for (const file of files) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      for (const [, key] of source.matchAll(/['"]((?:home|auth|agent|terminal|theme|language|error)\.\w+)['"]/g)) {
        expect(messages.en[key], `${file}: ${key}`).toBeString()
        expect(messages['zh-CN'][key], `${file}: ${key}`).toBeString()
      }
    }
    for (const suffix of ['read_file', 'propose_code', 'running', 'done', 'error', 'stopped']) {
      expect(translate('zh-CN', `agent.${suffix}`)).not.toBe('')
    }
  })

  test('interpolates without translating or treating supplied code as markup/templates', () => {
    expect(translate('zh-CN', 'terminal.saved', { path: '/home/{file}.py' })).toBe('已保存 /home/{file}.py')
    expect(translate('en', 'agent.review', { path: '<script>.py' })).toBe('Review replacement for <script>.py')
    expect(translate('en', 'terminal.loaded', { ms: 0 })).toBe('Pyodide loaded in 0ms.')
    expect(() => translate('en', 'nonexistent')).toThrow('Missing translation')
    expect(() => translate('zh-CN', 'terminal.saved')).toThrow('Missing translation value')
  })

  test('terminal help preserves executable commands in both languages', () => {
    for (const language of ['en', 'zh-CN']) {
      const help = translate(language, 'terminal.help')
      for (const command of ['help, ?', 'python3', 'clear', 'pwd', 'ls', 'mv <old> <new>', 'open <file>']) {
        expect(help).toContain(command)
      }
      expect(help).toContain('\r\n')
    }
  })
})

describe('localized errors', () => {
  test('existing errors can change language without losing status or remote diagnostics', () => {
    const english = (key, values) => translate('en', key, values)
    const chinese = (key, values) => translate('zh-CN', key, values)
    const error = new LocalizedError('agent.changed')
    expect(error.message).toBe(english('agent.changed'))
    expect(errorMessage(error, chinese)).toBe(chinese('agent.changed'))
    expect(errorMessage(error, english)).toBe(error.message)
    const remote = new AuthError('Invalid code', 401, 'auth.remoteError', { detail: 'Invalid code' })
    expect(remote.status).toBe(401)
    expect(errorMessage(remote, chinese)).toBe('认证失败：Invalid code')
    expect(errorMessage(new Error('Network unavailable'), chinese)).toBe('错误详情：Network unavailable')
    expect(errorMessage({}, chinese, 'auth.unableSignIn')).toBe('无法登录')
    expect(errorMessage(null, english)).toBe('')
  })
})
