import { Button, Dropdown, Tooltip } from 'antd'
import { GlobalOutlined, MoonOutlined, SettingOutlined, SunOutlined } from '@ant-design/icons'
import { useLanguage } from './LanguageProvider'
import { useTheme } from './ThemeProvider'

export default function AppearanceMenu() {
  const { language, changeLanguage, t } = useLanguage()
  const { mode, toggleTheme } = useTheme()
  const label = t('preferences.label')

  return (
    <Dropdown trigger={['click']} menu={{
      selectedKeys: [language],
      items: [
        {
          key: 'theme',
          icon: mode === 'dark' ? <SunOutlined /> : <MoonOutlined />,
          label: t(mode === 'dark' ? 'theme.light' : 'theme.dark'),
        },
        { type: 'divider' },
        {
          key: 'language',
          icon: <GlobalOutlined />,
          label: t('language.label'),
          children: [
            { key: 'zh-CN', label: '简体中文' },
            { key: 'en', label: 'English' },
          ],
        },
      ],
      onClick: ({ key }) => {
        if (key === 'theme') toggleTheme()
        else if (key === 'zh-CN' || key === 'en') changeLanguage(key)
      },
    }}>
      <Tooltip title={label}>
        <Button type="text" icon={<SettingOutlined />} aria-label={label} />
      </Tooltip>
    </Dropdown>
  )
}
