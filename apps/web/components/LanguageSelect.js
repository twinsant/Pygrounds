import { GlobalOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import { useLanguage } from './LanguageProvider'

export default function LanguageSelect() {
  const { language, changeLanguage, t } = useLanguage()
  return (
    <Dropdown trigger={['click']} menu={{
      selectedKeys: [language],
      items: [{ key: 'zh-CN', label: '简体中文' }, { key: 'en', label: 'English' }],
      onClick: ({ key }) => changeLanguage(key),
    }}>
      <Button type="text" icon={<GlobalOutlined />} aria-label={t('language.label')}
        title={t('language.label')}>{language === 'zh-CN' ? '中' : 'EN'}</Button>
    </Dropdown>
  )
}
