import { Html, Head, Main, NextScript } from 'next/document'
import { themeBootstrap, themeCss } from '../lib/theme'

export default function Document() {
    return (
      <Html lang="en" data-theme="dark">
        <Head>
            <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss }} />
            <script id="theme-initialize" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }