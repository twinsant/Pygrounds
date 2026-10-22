import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Typography } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { authRequest, maskEmail } from '../lib/auth'
import { useAuth } from './AuthProvider'
import styles from '../styles/Auth.module.css'
import { useLanguage } from './LanguageProvider'
import { errorMessage } from '../lib/i18n'

export default function AuthDialog({ open, onClose }) {
  const { t } = useLanguage()
  const { authenticate } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [expiresAt, setExpiresAt] = useState(0)
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(null)
  const emailInput = useRef(null)
  const codeInput = useRef(null)

  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => {
    if (!open || !challenge) return
    codeInput.current?.focus()
    const timer = setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [open, challenge, expiresAt])

  function reset() {
    setEmail('')
    setCode('')
    setChallenge(null)
    setExpired(false)
    setError('')
  }

  function close() {
    request.current?.abort()
    setBusy(false)
    onClose()
  }

  async function submit() {
    if (busy || expired) return
    setBusy(true)
    setError('')
    const controller = new AbortController()
    request.current = controller
    try {
      if (!challenge) {
        const result = await authRequest('start', { email: email.trim() }, controller.signal)
        if (controller.signal.aborted) return
        setChallenge(result)
        setExpiresAt(Date.now() + result.expires_in * 1000)
        setExpired(false)
      } else {
        const user = await authRequest('verify', {
          challenge_id: challenge.challenge_id, code,
        }, controller.signal)
        if (controller.signal.aborted) return
        authenticate(user)
        onClose()
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <Modal open={open} onCancel={close} footer={null} afterClose={reset}
      afterOpenChange={visible => { if (visible) emailInput.current?.focus() }}
      title={<Space><LockOutlined aria-hidden="true" />{t('auth.account')}</Space>} width={440} centered>
      <Typography.Title level={4}>
        {t(challenge ? 'auth.enterCode' : 'auth.welcome')}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {challenge
          ? challenge.step === 'enroll'
            ? t('auth.enrollInstructions', { email: maskEmail(challenge.email) })
            : t('auth.loginInstructions', { email: maskEmail(challenge.email) })
          : t('auth.introduction')}
      </Typography.Paragraph>
      <Form layout="vertical" onFinish={submit} requiredMark={false}>
        {challenge ? (
          <Form.Item label={t('auth.code')} htmlFor="pygrounds-auth-code">
            <Input id="pygrounds-auth-code" ref={codeInput} value={code} disabled={busy || expired}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} required pattern="[0-9]{6}"
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              size="large" className={styles.codeInput} />
          </Form.Item>
        ) : (
          <Form.Item label={t('auth.email')} htmlFor="pygrounds-auth-email">
            <Input id="pygrounds-auth-email" ref={emailInput} type="email" value={email}
              onChange={event => setEmail(event.target.value)} autoComplete="email"
              required maxLength={254} disabled={busy} placeholder="you@example.com" size="large" />
          </Form.Item>
        )}
        <Space orientation="vertical" size="middle" className={styles.fullWidth}>
          {error && <Alert type="error" showIcon title={errorMessage(error, t, 'auth.unableSignIn')} role="alert" />}
          {expired && <Alert type="warning" showIcon title={t('auth.expired')} role="alert" />}
          <Button type="primary" htmlType="submit" size="large" loading={busy} block
            aria-label={t(challenge ? 'auth.verify' : 'auth.continue')}
            disabled={expired || (!challenge ? !email.trim() : code.length !== 6)}>
            {t(challenge ? 'auth.verify' : 'auth.continue')}
          </Button>
          {challenge && <Button type="link" block disabled={busy} onClick={() => {
            setChallenge(null); setCode(''); setError(''); setExpired(false)
          }}>{t('auth.restart')}</Button>}
        </Space>
      </Form>
      <Typography.Paragraph type="secondary" className={styles.securityNote}>
        {t('auth.security')}
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" className={styles.storageNote}>
        {t('auth.localFiles')}
      </Typography.Paragraph>
      <Button block onClick={close}>{t('auth.guest')}</Button>
    </Modal>
  )
}
