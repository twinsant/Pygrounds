import { Button, Tooltip } from 'antd'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTheme } from './ThemeProvider'
import { useLanguage } from './LanguageProvider'

export default function ThemeToggle() {
  const { mode, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const label = t(mode === 'dark' ? 'theme.light' : 'theme.dark')
  return (
    <Tooltip title={label}>
      <Button type="text" aria-label={label} onClick={toggleTheme}
        icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />} />
    </Tooltip>
  )
}
