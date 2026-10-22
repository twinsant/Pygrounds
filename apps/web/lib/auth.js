import { LocalizedError, translate } from './i18n'

export class AuthError extends Error {
  constructor(message, status, translationKey, translationValues) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.translationKey = translationKey
    this.translationValues = translationValues
  }
}

export function maskEmail(email) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, Math.min(3, Math.max(0, name.length - 1)))}***@${domain}`
}

export async function authRequest(action, body, signal) {
  const methods = { me: 'GET', start: 'POST', verify: 'POST', logout: 'POST' }
  if (!Object.hasOwn(methods, action)) throw new LocalizedError('auth.unknownAction')
  const response = await fetch(`/api/auth/${action}`, {
    method: methods[action],
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  if (response.status === 204 && action === 'logout') return
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new AuthError(translate('en', 'auth.http', { status: response.status }), response.status,
      'auth.http', { status: response.status })
  }
  const result = await response.json()
  if (!response.ok) {
    const hasDetail = typeof result?.detail === 'string'
    const key = hasDetail ? 'auth.remoteError' : 'auth.failed'
    const values = { detail: result?.detail, status: response.status }
    throw new AuthError(translate('en', key, values), response.status, key, values)
  }
  const isUser = typeof result?.id === 'string' && result.id.length > 0 && typeof result?.email === 'string'
    && /^[^@]+@[^@]+$/.test(result.email)
  const isChallenge = ['enroll', 'login'].includes(result?.step)
    && typeof result?.challenge_id === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(result.challenge_id)
    && typeof result?.email === 'string' && /^[^@]+@[^@]+$/.test(result.email)
    && Number.isInteger(result?.expires_in) && result.expires_in >= 0 && result.expires_in <= 600
  if ((action === 'start' && !isChallenge)
    || (['me', 'verify'].includes(action) && !isUser) || action === 'logout') {
    throw new AuthError(translate('en', 'auth.invalidResponse'), response.status, 'auth.invalidResponse')
  }
  return result
}
