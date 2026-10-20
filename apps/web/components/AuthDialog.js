import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Typography } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { authRequest, maskEmail } from '../lib/auth'
import { useAuth } from './AuthProvider'
import styles from '../styles/Auth.module.css'

export default function AuthDialog({ open, onClose }) {
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
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <Modal open={open} onCancel={close} footer={null} afterClose={reset}
      afterOpenChange={visible => { if (visible) emailInput.current?.focus() }}
      title={<Space><LockOutlined aria-hidden="true" />Pygrounds account</Space>} width={440} centered>
      <Typography.Title level={4}>
        {challenge ? 'Enter your authenticator code' : 'Sign in or create an account'}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {challenge
          ? challenge.step === 'enroll'
            ? `Setup instructions were sent to ${maskEmail(challenge.email)}. Scan the emailed QR code with Google Authenticator, then enter its 6-digit code. Check your spam folder too.`
            : `Open the twinsant.com entry for ${maskEmail(challenge.email)} in your authenticator and enter its current code.`
          : 'Use your twinsant.com account and authenticator. New accounts receive a setup email. You can keep coding without signing in.'}
      </Typography.Paragraph>
      <Form layout="vertical" onFinish={submit} requiredMark={false}>
        {challenge ? (
          <Form.Item label="6-digit dynamic code" htmlFor="pygrounds-auth-code">
            <Input id="pygrounds-auth-code" ref={codeInput} value={code} disabled={busy || expired}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} required pattern="[0-9]{6}"
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              size="large" className={styles.codeInput} />
          </Form.Item>
        ) : (
          <Form.Item label="Email address" htmlFor="pygrounds-auth-email">
            <Input id="pygrounds-auth-email" ref={emailInput} type="email" value={email}
              onChange={event => setEmail(event.target.value)} autoComplete="email"
              required maxLength={254} disabled={busy} placeholder="you@example.com" size="large" />
          </Form.Item>
        )}
        <Space orientation="vertical" size="middle" className={styles.fullWidth}>
          {error && <Alert type="error" showIcon title={error} role="alert" />}
          {expired && <Alert type="warning" showIcon title="This request has expired. Restart to sign in." role="alert" />}
          <Button type="primary" htmlType="submit" size="large" loading={busy} block
            aria-label={challenge ? 'Verify and sign in' : 'Continue with email'}
            disabled={expired || (!challenge ? !email.trim() : code.length !== 6)}>
            {challenge ? 'Verify and sign in' : 'Continue with email'}
          </Button>
          {challenge && <Button type="link" block disabled={busy} onClick={() => {
            setChallenge(null); setCode(''); setError(''); setExpired(false)
          }}>Change email / Restart</Button>}
        </Space>
      </Form>
      <Typography.Paragraph type="secondary" className={styles.securityNote}>
        Your account and authenticator are shared with twinsant.com; each site has its own sign-in session.
        The emailed QR code and manual key grant long-term account access. Never forward them and delete
        the email after setup. Authenticator recovery is not available yet.
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" className={styles.storageNote}>
        Signing in does not upload or sync your code. Files stay in this browser.
      </Typography.Paragraph>
      <Button block onClick={close}>Continue as guest</Button>
    </Modal>
  )
}
