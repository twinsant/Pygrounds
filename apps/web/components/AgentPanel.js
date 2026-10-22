import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Space, Spin, Tag } from 'antd'
import { CloseOutlined, SendOutlined } from '@ant-design/icons'
import { useAuth } from './AuthProvider'
import AuthDialog from './AuthDialog'
import { AuthError } from '../lib/auth'
import { MAX_AGENT_CODE, runAgent } from '../lib/agent'
import styles from '../styles/Agent.module.css'

export default function AgentPanel({ open, onClose, getSnapshot, applyProposal }) {
  const { user, loading, error: authError, refresh, authenticate } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const session = useRef(null)
  const request = useRef(null)
  const feed = useRef(null)
  const enabled = Boolean(user) && !loading && !authError

  useEffect(() => {
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (open) feed.current?.scrollTo({ top: feed.current.scrollHeight })
  }, [messages, open])

  function stop() {
    request.current?.abort()
  }

  function newChat() {
    if (busy) return
    session.current = null
    setMessages([])
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!enabled || request.current || !prompt.trim()) return
    setError('')
    let snapshot
    try {
      snapshot = getSnapshot()
      if (snapshot.code.length > MAX_AGENT_CODE) throw new Error('Current file exceeds the Agent limit of 64,000 characters.')
    } catch (err) {
      setError(err.message)
      return
    }
    if (!session.current) session.current = crypto.randomUUID()
    const id = crypto.randomUUID()
    const controller = new AbortController()
    request.current = controller
    const question = prompt.trim()
    setPrompt('')
    setBusy(true)
    setMessages(current => [...current,
      { id: `${id}-user`, role: 'user', content: question },
      { id, role: 'agent', content: '', steps: [], snapshot },
    ])
    const patch = (update) => {
      if (request.current === controller) {
        setMessages(current => current.map(item => item.id === id ? update(item) : item))
      }
    }
    const timeout = setTimeout(() => controller.abort(), 195_000)
    try {
      const reply = await runAgent({
        session_id: session.current, prompt: question, editor: snapshot,
      }, controller.signal, (data) => {
        patch(item => ({
          ...item,
          steps: data.type === 'tool_start'
            ? [...item.steps, { ...data, state: 'running' }]
            : item.steps.map(step => step.id === data.id
              ? { ...step, ...data, state: data.ok ? 'done' : 'error' } : step),
        }))
      })
      patch(item => ({ ...item, content: reply }))
    } catch (err) {
      if (request.current !== controller) return
      if (err instanceof AuthError && err.status === 401) authenticate(null)
      else setError(err.name === 'AbortError' ? 'Agent request stopped. No changes were applied.' : err.message)
      patch(item => ({
        ...item, failed: true,
        steps: item.steps.map(step => step.state === 'running' ? { ...step, state: 'stopped' } : step),
      }))
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) {
        request.current = null
        setBusy(false)
      }
    }
  }

  function apply(message, step) {
    if (!enabled || busy) return
    try {
      applyProposal(message.snapshot, step.proposal)
      setMessages(current => current.map(item => item.id === message.id ? {
        ...item, steps: item.steps.map(s => s.id === step.id ? { ...s, applied: true } : s),
      } : item))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <aside id="agent-panel" className={styles.panel} hidden={!open} aria-label="Agent">
      <div className={styles.heading}>
        <strong>Agent</strong>
        <Space>
          {enabled && <Button size="small" disabled={busy} onClick={newChat}>New chat</Button>}
          <Button type="text" icon={<CloseOutlined />} aria-label="Close Agent" onClick={onClose} />
        </Space>
      </div>
      {!enabled ? (
        <div className={styles.gate}>
          {loading ? <Spin aria-label="Checking account" /> : authError ? (
            <Alert type="error" title={authError} action={<Button onClick={refresh}>Retry</Button>} />
          ) : (
            <>
              <p>Sign in to use the coding Agent.</p>
              <p>Your editor and local Python runtime remain available without an account.</p>
              <Button type="primary" onClick={() => setLoginOpen(true)}>Sign in / Register</Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={styles.feed} ref={feed} role="log" aria-label="Agent conversation" aria-live="polite">
            {!messages.length && <p className={styles.notice}>Ask about your Python code. Sending shares the current file with the server and Anthropic. Other local files are not sent. Changes require your approval.</p>}
            {messages.map(message => (
              <article key={message.id} className={styles.message}>
                <strong>{message.role === 'user' ? 'You' : 'Agent'}</strong>
                {message.steps?.map(step => (
                  <div key={step.id} className={styles.step}>
                    <Tag color={step.state === 'error' ? 'error' : step.state === 'done' ? 'success' : 'processing'}>
                      {step.name} · {step.state}
                    </Tag>
                    {step.preview && <p>{step.preview}</p>}
                    {step.proposal && (
                      <details>
                        <summary>Review replacement for {step.proposal.path}</summary>
                        <pre className={styles.code}>{step.proposal.code}</pre>
                        <Button size="small" disabled={busy || step.applied || message.failed}
                          onClick={() => apply(message, step)}>
                          {step.applied ? 'Applied to editor' : 'Apply to editor'}
                        </Button>
                      </details>
                    )}
                  </div>
                ))}
                {message.content && <div className={styles.text}>{message.content}</div>}
                {message.role === 'agent' && !message.content && !message.failed && <Spin size="small" />}
                {message.failed && <p>Request did not complete.</p>}
              </article>
            ))}
          </div>
          {error && <Alert type="error" title={error} role="alert" />}
          <form className={styles.composer} onSubmit={submit}>
            <Input.TextArea aria-label="Message Agent" value={prompt} maxLength={8000}
              onChange={event => setPrompt(event.target.value)} autoSize={{ minRows: 3, maxRows: 8 }}
              placeholder="Explain, debug, or improve the current file..." />
            <Space className={styles.actions}>
              {busy && <Button onClick={stop}>Stop</Button>}
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}
                disabled={busy || !prompt.trim()}>Send</Button>
            </Space>
            <small>Apply only edits the buffer. Save and Run remain manual.</small>
          </form>
        </>
      )}
      <AuthDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </aside>
  )
}
