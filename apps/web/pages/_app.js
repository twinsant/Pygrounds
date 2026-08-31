import '../styles/globals.css'
import Script from 'next/script'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

const googleTagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID

function GoogleTag() {
  if (!googleTagId) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${googleTagId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}

function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    if (!googleTagId) {
      return undefined
    }

    const handleRouteChange = (url) => {
      window.gtag?.('config', googleTagId, {
        page_path: url,
      })
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <>
      <GoogleTag />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
