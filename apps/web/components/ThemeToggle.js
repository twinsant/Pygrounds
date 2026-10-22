import { Button, Tooltip } from 'antd'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { mode, toggleTheme } = useTheme()
  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <Tooltip title={label}>
      <Button type="text" aria-label={label} onClick={toggleTheme}
        icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />} />
    </Tooltip>
  )
}
