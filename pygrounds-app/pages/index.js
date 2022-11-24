import { useState, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { Breadcrumb, Layout, Menu } from 'antd';
import { Col, Row } from 'antd';
import styles from '../styles/Home.module.css'
// import { WebLinksAddon } from 'xterm-addon-web-links';

const { Header, Content, Footer } = Layout;

export default function Home() {
  var term;

  async function pyodideLoaded() {
    console.log('pyodide ready.')
    // https://pyodide.org/en/stable/usage/quickstart.html
    let pyodide = await loadPyodide();
    // Pyodide is now ready to use...
    var msg = pyodide.runPython(`
      import sys
      sys.version
    `);
    term.write(`Python ${msg}\r\n`);
  }

  function xtermLoaded() {
  }

  useEffect(() => {
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/xterm.css" />
      </Head>
      <Script src="/xterm.js" 
      onLoad={()=>{
        console.log("xterm ready.");
        term = new Terminal();
        // terminal.loadAddon(new WebLinksAddon());
        term.open(document.getElementById('terminal'));
        term.write('Loading \x1B[1;3;31mPygrounds v0.1\x1B[0m ... \r\n')
      }}/>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js"
      onLoad={pyodideLoaded} />

      <Layout className="layout">
        <Header>
          <div className="logo" />
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['2']}
            items={new Array(3).fill(null).map((_, index) => {
              const key = index + 1;
              return {
                key,
                label: `Nav ${key}`,
              };
            })}
          />
        </Header>
        <Content
          style={{
            padding: '0 50px',
          }}
        >
          <Breadcrumb
            style={{
              margin: '16px 0',
            }}
          >
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>Hello, World!</Breadcrumb.Item>
          </Breadcrumb>
          <div>
            <Row>
              <Col span={12}>
                {/* <Row>
                  <Col>Text</Col>
                </Row>
                <Row>
                  <Col>Editor</Col>
                </Row> */}
              </Col>
              <Col span={12}><div id="terminal" /></Col>
            </Row>
          </div>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
          }}
        >
          Pygrounds ©2022 Created by <a href="https://twitter.com/twinsant">twinsant</a>
        </Footer>
      </Layout>
    </div>
  )
}
