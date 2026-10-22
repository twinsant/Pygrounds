import { AuthError } from './auth'

export const MAX_AGENT_CODE = 64_000

function invalidEvent() {
  throw new Error('Invalid Agent service event. Please try again.')
}

export function parseAgentEvent(frame) {
  let type = ''
  const lines = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) type = line.slice(6).trim()
    if (line.startsWith('data:')) lines.push(line.slice(5).trimStart())
  }
  if (!lines.length) {
    if (!type) return null
    return invalidEvent()
  }
  let data
  try {
    data = JSON.parse(lines.join('\n'))
  } catch {
    return invalidEvent()
  }
  if (!data || typeof data !== 'object' || data.type !== type) return invalidEvent()
  if (type === 'error') {
    if (typeof data.detail !== 'string' || !data.detail) return invalidEvent()
  } else if (type === 'reply') {
    if (typeof data.reply !== 'string' || !data.reply.trim()) return invalidEvent()
  } else if (['tool_start', 'tool_result'].includes(type)) {
    if (typeof data.id !== 'string' || !['read_file', 'propose_code'].includes(data.name)) return invalidEvent()
    if (type === 'tool_result') {
      if (typeof data.ok !== 'boolean' || typeof data.preview !== 'string') return invalidEvent()
      if (data.proposal !== undefined) {
        const p = data.proposal
        if (!data.ok || data.name !== 'propose_code' || !p
          || typeof p.path !== 'string' || !p.path
          || typeof p.code !== 'string' || p.code.length > MAX_AGENT_CODE
          || typeof p.summary !== 'string' || !p.summary) return invalidEvent()
      }
    }
  } else {
    return invalidEvent()
  }
  return data
}

export async function runAgent(body, signal, onEvent) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    let detail = `Agent service returned HTTP ${response.status}. Please try again.`
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json()
      if (typeof data?.detail === 'string') detail = data.detail
    }
    throw new AuthError(detail, response.status)
  }
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('Invalid Agent service response. Please try again.')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  let reply = ''
  const consume = (frame) => {
    const event = parseAgentEvent(frame)
    if (!event) return
    if (completed) throw new Error('Agent sent events after completing its response.')
    if (event.type === 'error') throw new Error(event.detail)
    if (event.type === 'reply') {
      completed = true
      reply = event.reply
    } else {
      onEvent(event)
    }
  }
  try {
    for (;;) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      // Normalize after buffering so CRLF delimiters split across chunks remain intact.
      buffer = buffer.replace(/\r\n/g, '\n')
      if (buffer.length > 300_000) throw new Error('Agent event exceeded the size limit.')
      let index
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        consume(buffer.slice(0, index))
        buffer = buffer.slice(index + 2)
      }
      if (done) break
    }
    if (buffer.trim()) consume(buffer)
    if (!completed) throw new Error('Agent connection ended before a reply was received.')
    return reply
  } finally {
    try {
      await reader.cancel()
    } finally {
      reader.releaseLock()
    }
  }
}

export function assertProposalTarget(snapshot, current, proposal) {
  if (proposal.path !== snapshot.path || current.path !== snapshot.path || current.code !== snapshot.code) {
    throw new Error('The editor has changed since this request. Ask the Agent again before applying.')
  }
}
