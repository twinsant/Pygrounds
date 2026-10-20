import { afterEach, describe, expect, mock, test } from 'bun:test'
import { AuthError, authRequest, maskEmail } from '../lib/auth'
import config from '../next.config'

const originalFetch = globalThis.fetch
const originalOrigin = process.env.PYGROUNDS_AUTH_API_ORIGIN

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalOrigin === undefined) delete process.env.PYGROUNDS_AUTH_API_ORIGIN
  else process.env.PYGROUNDS_AUTH_API_ORIGIN = originalOrigin
})

function respond(body, status = 200) {
  globalThis.fetch = mock(() => Promise.resolve(Response.json(body, { status })))
}

describe('shared authentication transport', () => {
  test('checks the same-origin session without persisting credentials', async () => {
    const user = { id: 'shared-user', email: 'reader@example.com' }
    respond(user)
    expect(await authRequest('me')).toEqual(user)
    expect(globalThis.fetch.mock.calls[0]).toEqual(['/api/auth/me', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: undefined, body: undefined, signal: undefined,
    }])
  })

  test('sends enrollment and verification through the same-origin proxy', async () => {
    const challenge = { step: 'enroll', challenge_id: 'a'.repeat(43), email: 'reader@example.com', expires_in: 600 }
    respond(challenge)
    expect(await authRequest('start', { email: challenge.email })).toEqual(challenge)
    expect(globalThis.fetch.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({ email: challenge.email })
    respond({ id: 'shared-user', email: challenge.email })
    const controller = new AbortController()
    await authRequest('verify', { challenge_id: challenge.challenge_id, code: '123456' }, controller.signal)
    expect(globalThis.fetch.mock.calls[0][1].signal).toBe(controller.signal)
  })

  test('accepts logout only when the server confirms revocation', async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(null, { status: 204 })))
    expect(await authRequest('logout', {})).toBeUndefined()
    respond({ success: true })
    await expect(authRequest('logout', {})).rejects.toThrow('Invalid authentication service response')
  })

  test('preserves explicit authentication errors and status', async () => {
    respond({ detail: '动态码不正确' }, 401)
    try {
      await authRequest('verify', { code: '000000' })
      throw new Error('Expected authentication to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError)
      expect(error.status).toBe(401)
      expect(error.message).toBe('动态码不正确')
    }
  })

  test('reports upstream failure even when the proxy returns HTML', async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response('<html>unavailable</html>', { status: 502 })))
    await expect(authRequest('me')).rejects.toThrow('HTTP 502')
  })

  test('does not accept success-shaped malformed payloads', async () => {
    for (const payload of [null, {}, { id: '', email: 'reader@example.com' }, { id: 1, email: 'reader@example.com' }, { id: 'id', email: 'invalid' }]) {
      respond(payload)
      await expect(authRequest('me')).rejects.toThrow('Invalid authentication service response')
    }
    for (const payload of [
      { step: 'unknown', challenge_id: 'a'.repeat(43), email: 'reader@example.com', expires_in: 600 },
      { step: 'login', challenge_id: 'short', email: 'reader@example.com', expires_in: 600 },
      { step: 'enroll', challenge_id: 'a'.repeat(43), email: 'reader@example.com', expires_in: -1 },
      { step: 'login', challenge_id: 'a'.repeat(129), email: 'reader@example.com', expires_in: 600 },
      { step: 'login', challenge_id: 'a'.repeat(43), email: 'reader@example.com', expires_in: 601 },
    ]) {
      respond(payload)
      await expect(authRequest('start', { email: 'reader@example.com' })).rejects.toThrow('Invalid authentication service response')
    }
  })

  test('rejects unknown actions before issuing requests', async () => {
    globalThis.fetch = mock()
    await expect(authRequest('../unexpected')).rejects.toThrow('Unknown authentication action')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('masks short and long email local parts', () => {
    expect(maskEmail('reader@example.com')).toBe('rea***@example.com')
    expect(maskEmail('ab@example.com')).toBe('a***@example.com')
    expect(maskEmail('a@example.com')).toBe('***@example.com')
  })
})

describe('authentication proxy configuration', () => {
  test('reuses the existing auth service rather than adding a database client', async () => {
    delete process.env.PYGROUNDS_AUTH_API_ORIGIN
    expect(await config.rewrites()).toEqual([{
      source: '/api/auth/:action(start|verify|me|logout)',
      destination: 'http://127.0.0.1:8000/auth/totp/:action',
    }])
  })

  test('supports an explicit auth-service origin', async () => {
    process.env.PYGROUNDS_AUTH_API_ORIGIN = 'https://auth.example.com/'
    expect((await config.rewrites())[0].destination).toBe('https://auth.example.com/auth/totp/:action')
  })

  test('rejects invalid proxy targets instead of silently choosing a fallback', async () => {
    for (const origin of ['file:///tmp/test', 'https://user:secret@example.com', 'https://example.com/fapi', 'https://example.com/?q=test', 'invalid']) {
      process.env.PYGROUNDS_AUTH_API_ORIGIN = origin
      await expect(config.rewrites()).rejects.toThrow()
    }
  })
})
