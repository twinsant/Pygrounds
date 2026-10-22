import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import styles from '../styles/Markdown.module.css'

const markdown = new Marked({ breaks: true, gfm: true })

export default function Markdown({ content }) {
  const html = useMemo(() => {
    const raw = markdown.parse(String(content || ''))
    if (typeof raw !== 'string') throw new Error('Markdown parser returned an asynchronous result.')
    return DOMPurify.sanitize(raw)
  }, [content])

  return (
    <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
