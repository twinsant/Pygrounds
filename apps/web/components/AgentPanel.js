import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Space, Spin, Tag } from 'antd'
import { CloseOutlined, SendOutlined } from '@ant-design/icons'
import { useAuth } from './AuthProvider'
import AuthDialog from './AuthDialog'
import { AuthError } from '../lib/auth'
import { MAX_AGENT_CODE, runAgent } from '../lib/agent'
import styles from '../styles/Agent.module.css'
import { useLanguage } from './LanguageProvider'
import { errorMessage, LocalizedError } from '../lib/i18n'
import dynamic from 'next/dynamic'

const Markdown = dynamic(() => import('./Markdown'), { ssr: false })

export default function AgentPanel({ open, onClose, getSnapshot, applyProposal, panelRef }) {
  const { t } = useLanguage()
  const { user, loading, error: authError, refresh, authenticate } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const session = useRef(null)
  const request = useRef(null)
  const feed = useRef(null)
  const composer = useRef(null)
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

  useEffect(() => {
    if (error) composer.current?.scrollTo({ top: 0 })
  }, [error])

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
      if (snapshot.code.length > MAX_AGENT_CODE) throw new LocalizedError('agent.codeLimit')
    } catch (err) {
      setError(err)
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
      else setError(err.name === 'AbortError' ? new LocalizedError('agent.cancelled') : err)
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
      setError(err)
    }
  }

  return (
    <aside ref={panelRef} id="agent-panel" className={styles.panel} hidden={!open} aria-label={t('agent.title')}>
      <div className={styles.heading}>
        <strong>{t('agent.title')}</strong>
        <Space>
          {enabled && <Button size="small" disabled={busy} onClick={newChat}>{t('agent.newChat')}</Button>}
          <Button type="text" icon={<CloseOutlined />} aria-label={t('agent.close')} onClick={onClose} />
        </Space>
      </div>
      {!enabled ? (
        <div className={styles.gate}>
          {loading ? <Spin aria-label={t('agent.checking')} /> : authError ? (
            <Alert type="error" title={errorMessage(authError, t, 'auth.unableCheck')} action={<Button onClick={refresh}>{t('agent.retry')}</Button>} />
          ) : (
            <>
              <p>{t('agent.signIn')}</p>
              <p>{t('agent.guest')}</p>
              <Button type="primary" onClick={() => setLoginOpen(true)}>{t('auth.signIn')}</Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={styles.feed} ref={feed} role="log" aria-label={t('agent.conversation')} aria-live="polite">
            {!messages.length && <p className={styles.notice}>{t('agent.notice')}</p>}
            {messages.map(message => (
              <article key={message.id} className={styles.message} data-role={message.role}>
                <strong>{t(message.role === 'user' ? 'agent.you' : 'agent.title')}</strong>
                {message.steps?.map(step => (
                  <div key={step.id} className={styles.step}>
                    <Tag color={step.state === 'error' ? 'error' : step.state === 'done' ? 'success' : 'processing'}>
                      {t(`agent.${step.name}`)} · {t(`agent.${step.state}`)}
                    </Tag>
                    {step.preview && <p>{step.preview}</p>}
                    {step.proposal && (
                      <details>
                        <summary>{t('agent.review', { path: step.proposal.path })}</summary>
                        <pre className={styles.code}>{step.proposal.code}</pre>
                        <Button size="small" disabled={busy || step.applied || message.failed}
                          onClick={() => apply(message, step)}>
                          {t(step.applied ? 'agent.applied' : 'agent.apply')}
                        </Button>
                      </details>
                    )}
                  </div>
                ))}
                {message.content && <Markdown content={message.content} />}
                {message.role === 'agent' && !message.content && !message.failed && <Spin size="small" />}
                {message.failed && <p>{t('agent.incomplete')}</p>}
              </article>
            ))}
          </div>
          <form ref={composer} className={styles.composer} onSubmit={submit}>
            {error && <Alert type="error" title={errorMessage(error, t)} role="alert" />}
            <Input.TextArea aria-label={t('agent.message')} value={prompt} maxLength={8000}
              onChange={event => setPrompt(event.target.value)} autoSize={{ minRows: 3, maxRows: 8 }}
              onPressEnter={event => {
                if (!event.shiftKey && !event.nativeEvent.isComposing) submit(event)
              }}
              placeholder={t('agent.placeholder')} />
            <Space className={styles.actions}>
              {busy && <Button onClick={stop}>{t('agent.stop')}</Button>}
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}
                disabled={busy || !prompt.trim()}>{t('agent.send')}</Button>
            </Space>
            <small>{t('agent.manual')}</small>
          </form>
        </>
      )}
      <AuthDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </aside>
  )
}
