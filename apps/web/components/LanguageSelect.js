import { GlobalOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import { useLanguage } from './LanguageProvider'
import { trackEvent } from '../lib/analytics'

export default function LanguageSelect() {
  const { language, changeLanguage, t } = useLanguage()
  return (
    <Dropdown trigger={['click']} menu={{
      selectedKeys: [language],
      items: [{ key: 'zh-CN', label: '简体中文' }, { key: 'en', label: 'English' }],
      onClick: ({ key }) => {
        trackEvent('language_switch', { from: language, to: key })
        changeLanguage(key)
      },
    }}>
      <Button type="text" icon={<GlobalOutlined />} aria-label={t('language.label')}
        title={t('language.label')}>{language === 'zh-CN' ? '中' : 'EN'}</Button>
    </Dropdown>
  )
}
