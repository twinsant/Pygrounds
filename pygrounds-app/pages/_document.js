import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
      <Html>
        <Head>
            <link rel="icon" href="/favicon.ico" />
            <link rel="stylesheet" href="/xterm.css" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }