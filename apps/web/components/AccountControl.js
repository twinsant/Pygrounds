import { useState } from 'react'
import { Alert, Button, Dropdown, Tooltip } from 'antd'
import {
  GlobalOutlined, LogoutOutlined, MoonOutlined, ReloadOutlined, SettingOutlined,
  SunOutlined, UserOutlined,
} from '@ant-design/icons'
import { useAuth } from './AuthProvider'
import AuthDialog from './AuthDialog'
import { maskEmail } from '../lib/auth'
import styles from '../styles/Auth.module.css'
import { useLanguage } from './LanguageProvider'
import { useTheme } from './ThemeProvider'
import { errorMessage } from '../lib/i18n'

export default function AccountControl() {
  const { language, changeLanguage, t } = useLanguage()
  const { mode, toggleTheme } = useTheme()
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

  const items = [
    {
      key: 'account',
      label: user ? maskEmail(user.email) : t(loading ? 'auth.checking' : 'auth.signIn'),
      icon: <UserOutlined />,
      disabled: Boolean(user) || loading,
    },
    { type: 'divider' },
    {
      key: 'theme',
      label: t(mode === 'dark' ? 'theme.light' : 'theme.dark'),
      icon: mode === 'dark' ? <SunOutlined /> : <MoonOutlined />,
    },
    {
      key: 'language',
      label: t('language.label'),
      icon: <GlobalOutlined />,
      children: [
        { key: 'zh-CN', label: '简体中文' },
        { key: 'en', label: 'English' },
      ],
    },
  ]
  if (error) {
    items.push({ type: 'divider' }, { key: 'retry', label: t('auth.retry'), icon: <ReloadOutlined /> })
  }
  if (user) {
    items.push({
      type: 'divider',
    }, {
      key: 'logout',
      label: t(busy ? 'auth.signingOut' : 'auth.signOut'),
      icon: <LogoutOutlined />,
      disabled: busy,
    })
  }

  return (
    <div className={styles.account}>
      <Dropdown trigger={['click']} menu={{
        selectedKeys: [language],
        items,
        onClick: ({ key }) => {
          if (key === 'theme') toggleTheme()
          else if (key === 'zh-CN' || key === 'en') changeLanguage(key)
          else if (key === 'account' && !user && !loading) setOpen(true)
          else if (key === 'retry') refresh()
          else if (key === 'logout') void handleLogout()
        },
      }}>
        <Tooltip title={error ? errorMessage(error, t, 'auth.unableCheck') : t('preferences.label')}>
          <Button type="text" aria-label={error ? t('auth.retry') : t('preferences.label')}
            icon={error ? <ReloadOutlined /> : <SettingOutlined />}
            loading={busy} className={styles.trigger} />
        </Tooltip>
      </Dropdown>
      {logoutError && <Alert className={styles.logoutError} type="error" title={errorMessage(logoutError, t, 'auth.unableSignOut')}
        showIcon role="alert" closable onClose={() => setLogoutError('')} />}
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
