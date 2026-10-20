import { useState } from 'react'
import { Alert, Button, Dropdown, Tooltip } from 'antd'
import { LogoutOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from './AuthProvider'
import AuthDialog from './AuthDialog'
import { maskEmail } from '../lib/auth'
import styles from '../styles/Auth.module.css'

export default function AccountControl() {
  const { user, loading, error, refresh, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setBusy(true)
    setLogoutError('')
    try {
      await logout()
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : 'Unable to sign out')
    } finally {
      setBusy(false)
    }
  }

  const label = user ? maskEmail(user.email) : 'Sign in / Register'
  return (
    <div className={styles.account}>
      {error ? (
        <Tooltip title={error}>
          <Button type="text" icon={<ReloadOutlined />} className={styles.trigger}
            aria-label="Account unavailable · Retry" onClick={refresh}>Account unavailable · Retry</Button>
        </Tooltip>
      ) : user ? (
        <Dropdown trigger={['click']} menu={{
          items: [
            { key: 'email', label: maskEmail(user.email), disabled: true },
            { type: 'divider' },
            { key: 'logout', label: busy ? 'Signing out...' : 'Sign out', icon: <LogoutOutlined />, disabled: busy },
          ],
          onClick: ({ key }) => { if (key === 'logout') void handleLogout() },
        }}>
          <Button type="text" aria-label="Account menu" icon={<UserOutlined />}
            loading={busy} className={styles.trigger}>
            <span className={styles.accountLabel}>{label}</span>
          </Button>
        </Dropdown>
      ) : (
        <Button type="text" icon={<UserOutlined />} className={styles.trigger}
          aria-label={loading ? 'Checking account...' : 'Sign in / Register'}
          loading={loading} disabled={loading} onClick={() => setOpen(true)}>
          {loading ? 'Checking account...' : label}
        </Button>
      )}
      {logoutError && <Alert className={styles.logoutError} type="error" title={logoutError}
        showIcon role="alert" closable onClose={() => setLogoutError('')} />}
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
