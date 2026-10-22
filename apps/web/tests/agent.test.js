import { afterEach, describe, expect, mock, test } from 'bun:test'
import { AuthError } from '../lib/auth'
import { assertProposalTarget, parseAgentEvent, runAgent } from '../lib/agent'
import config from '../next.config'

const originalFetch = globalThis.fetch
const originalOrigin = process.env.PYGROUNDS_AUTH_API_ORIGIN
afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalOrigin === undefined) delete process.env.PYGROUNDS_AUTH_API_ORIGIN
  else process.env.PYGROUNDS_AUTH_API_ORIGIN = originalOrigin
})

function frame(data, newline = '\n') {
  return `event: ${data.type}${newline}data: ${JSON.stringify(data)}${newline}${newline}`
}

function stream(text, chunkSize = 1) {
  const bytes = new TextEncoder().encode(text)
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
      controller.close()
    },
  })
  globalThis.fetch = mock(async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } }))
}

describe('Agent SSE transport', () => {
  test('uses same-origin cookies and handles fragmented CRLF, UTF-8 and tool events', async () => {
    const start = { type: 'tool_start', id: '0', name: 'read_file' }
    const result = { type: 'tool_result', id: '0', name: 'read_file', ok: true, preview: 'Read file' }
    stream(`: ping\r\n\r\n${frame(start, '\r\n')}${frame(result)}${frame({ type: 'reply', reply: '你好 Python' })}`)
    const events = []
    const body = { session_id: 'session', prompt: 'Explain', editor: { path: 'main.py', code: 'print(1)' } }
    const controller = new AbortController()
    expect(await runAgent(body, controller.signal, event => events.push(event))).toBe('你好 Python')
    expect(events).toEqual([start, result])
    expect(globalThis.fetch.mock.calls[0]).toEqual(['/api/agent', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
    }])
  })

  test('returns 401 for session expiry rather than accepting a response as chat', async () => {
    globalThis.fetch = mock(async () => Response.json({ detail: 'Please sign in' }, { status: 401 }))
    try {
      await runAgent({}, undefined, mock())
      throw new Error('Expected unauthorized')
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError)
      expect(error.status).toBe(401)
      expect(error.message).toBe('Please sign in')
    }
  })

  test('reports unavailable proxy and wrong content types', async () => {
    globalThis.fetch = mock(async () => new Response('<html>unavailable</html>', { status: 502 }))
    await expect(runAgent({}, undefined, mock())).rejects.toThrow('HTTP 502')
    globalThis.fetch = mock(async () => Response.json({ reply: 'not SSE' }))
    await expect(runAgent({}, undefined, mock())).rejects.toThrow('Invalid Agent service response')
  })

  test('does not turn truncated or failed streams into successful replies', async () => {
    stream(frame({ type: 'tool_start', id: '0', name: 'read_file' }))
    await expect(runAgent({}, undefined, mock())).rejects.toThrow('before a reply')
    stream(frame({ type: 'error', detail: 'Model unavailable' }))
    await expect(runAgent({}, undefined, mock())).rejects.toThrow('Model unavailable')
  })

  test('rejects malformed, unknown and success-shaped invalid events', async () => {
    for (const data of [
      { type: 'reply', reply: '' },
      { type: 'reply', reply: 1 },
      { type: 'error' },
      { type: 'unknown' },
      { type: 'tool_start', id: '0', name: 'run_shell' },
      { type: 'tool_result', id: '0', name: 'read_file', ok: 'true', preview: 'read' },
      { type: 'tool_result', id: '0', name: 'propose_code', ok: true, preview: 'edit', proposal: { code: 1 } },
    ]) {
      stream(frame(data))
      await expect(runAgent({}, undefined, mock())).rejects.toThrow('Invalid Agent service event')
    }
    expect(() => parseAgentEvent('event: reply\ndata: {')).toThrow('Invalid Agent service event')
    expect(() => parseAgentEvent('event: reply')).toThrow('Invalid Agent service event')
    expect(() => parseAgentEvent('event: error\ndata: {"type":"reply","reply":"wrong"}')).toThrow()
  })

  test('rejects duplicate terminal events and oversized frames', async () => {
    stream(frame({ type: 'reply', reply: 'done' }).repeat(2))
    await expect(runAgent({}, undefined, mock())).rejects.toThrow('after completing')
    stream(`data: ${'a'.repeat(300_001)}`, 100_000)
    await expect(runAgent({}, undefined, mock())).rejects.toThrow('size limit')
  })

  test('preserves abort errors', async () => {
    globalThis.fetch = mock(async (_url, { signal }) => {
      signal.throwIfAborted()
    })
    const controller = new AbortController()
    controller.abort()
    await expect(runAgent({}, controller.signal, mock())).rejects.toHaveProperty('name', 'AbortError')
  })
})

describe('editor proposal guard', () => {
  const snapshot = { path: '/home/pygrounds/main.py', code: 'print(1)' }
  const proposal = { path: snapshot.path, code: 'print(2)' }
  test('permits a proposal only for the unchanged requested buffer', () => {
    expect(() => assertProposalTarget(snapshot, { ...snapshot }, proposal)).not.toThrow()
    for (const current of [{ ...snapshot, path: 'other.py' }, { ...snapshot, code: 'unsaved edit' }]) {
      expect(() => assertProposalTarget(snapshot, current, proposal)).toThrow('editor has changed')
    }
    expect(() => assertProposalTarget(snapshot, snapshot, { ...proposal, path: 'other.py' })).toThrow()
  })
})

test('Agent proxy uses the same configured FastAPI origin as authentication', async () => {
  process.env.PYGROUNDS_AUTH_API_ORIGIN = 'https://auth.example.com'
  expect((await config.rewrites())[1]).toEqual({
    source: '/api/agent', destination: 'https://auth.example.com/pygrounds/agent',
  })
  expect(config.experimental.proxyTimeout).toBe(240_000)
})
