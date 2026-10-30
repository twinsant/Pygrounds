/**
 * GA4 事件封装。
 *
 * gtag 由 pages/_app.js 注入；没配 NEXT_PUBLIC_GOOGLE_TAG_ID 时 window.gtag 不存在，
 * 这里所有调用都是空操作，本地开发不会往线上灌数据。
 */
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const payload = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }
    payload[key] = value
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, payload)
    return
  }

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(['event', name, payload])
}

/** 代码行数按量级分桶，避免把用户代码细节带进分析平台。 */
export function codeSizeBucket(code) {
  const lines = String(code || '').split('\n').length
  if (lines <= 5) return '1-5'
  if (lines <= 20) return '6-20'
  if (lines <= 50) return '21-50'
  return '50+'
}
