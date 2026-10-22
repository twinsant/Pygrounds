import { useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import styles from '../styles/Markdown.module.css'

const markdown = new Marked({ breaks: true, gfm: true })

export default function Markdown({ content, language, t }) {
  const root = useRef(null)
  const html = useMemo(() => {
    const raw = markdown.parse(String(content || ''))
    if (typeof raw !== 'string') throw new Error('Markdown parser returned an asynchronous result.')
    return DOMPurify.sanitize(raw)
  }, [content])

  useEffect(() => {
    const wrappers = []
    root.current?.querySelectorAll('pre').forEach((pre) => {
      const wrapper = document.createElement('div')
      wrapper.className = styles.copyBlock || ''
      const button = document.createElement('button')
      button.type = 'button'
      button.className = styles.copyButton || ''
      button.textContent = t('markdown.copy')
      button.setAttribute('aria-label', t('markdown.copy'))
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent || '')
          button.textContent = t('markdown.copied')
          button.setAttribute('aria-label', t('markdown.copied'))
        } catch (error) {
          console.warn('Code block could not be copied to the clipboard.', error)
          button.textContent = t('markdown.copyFailed')
          button.setAttribute('aria-label', t('markdown.copyFailed'))
        }
      })
      pre.parentNode.insertBefore(wrapper, pre)
      wrapper.append(button, pre)
      wrappers.push(wrapper)
    })
    return () => wrappers.forEach(wrapper => {
      const parent = wrapper.parentNode
      if (!parent) return
      parent.insertBefore(wrapper.querySelector('pre'), wrapper)
      wrapper.remove()
    })
  }, [html, language, t])

  return (
    <div ref={root} className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
