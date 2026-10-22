import { useState } from 'react'
import { Alert, Button, Dropdown, Tooltip } from 'antd'
import { LogoutOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from './AuthProvider'
import AuthDialog from './AuthDialog'
import { maskEmail } from '../lib/auth'
import styles from '../styles/Auth.module.css'
import { useLanguage } from './LanguageProvider'
import { errorMessage } from '../lib/i18n'

export default function AccountControl() {
  const { t } = useLanguage()
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
      setLogoutError(err)
    } finally {
      setBusy(false)
    }
  }

  const label = user ? maskEmail(user.email) : t('auth.signIn')
  return (
    <div className={styles.account}>
      {error ? (
        <Tooltip title={errorMessage(error, t, 'auth.unableCheck')}>
          <Button type="text" icon={<ReloadOutlined />} className={styles.trigger}
            aria-label={t('auth.retry')} onClick={refresh}>{t('auth.retry')}</Button>
        </Tooltip>
      ) : user ? (
        <Dropdown trigger={['click']} menu={{
          items: [
            { key: 'email', label: maskEmail(user.email), disabled: true },
            { type: 'divider' },
            { key: 'logout', label: t(busy ? 'auth.signingOut' : 'auth.signOut'), icon: <LogoutOutlined />, disabled: busy },
          ],
          onClick: ({ key }) => { if (key === 'logout') void handleLogout() },
        }}>
          <Button type="text" aria-label={t('auth.menu')} icon={<UserOutlined />}
            loading={busy} className={styles.trigger}>
            <span className={styles.accountLabel}>{label}</span>
          </Button>
        </Dropdown>
      ) : (
        <Button type="text" icon={<UserOutlined />} className={styles.trigger}
          aria-label={t(loading ? 'auth.checking' : 'auth.signIn')}
          loading={loading} disabled={loading} onClick={() => setOpen(true)}>
          {loading ? t('auth.checking') : label}
        </Button>
      )}
      {logoutError && <Alert className={styles.logoutError} type="error" title={errorMessage(logoutError, t, 'auth.unableSignOut')}
        showIcon role="alert" closable onClose={() => setLogoutError('')} />}
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
