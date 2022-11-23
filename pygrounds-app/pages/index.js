import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  useEffect(() => {
    var term = new Terminal();
    term.open(document.getElementById('terminal'));
    term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')

    console.log('xterm ready.')
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/xterm.css" />
        <script src="/xterm.js"></script>
      </Head>

      <div id="terminal"/>
    </div>
  )
}
