import { useState, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { Breadcrumb, Layout, Menu } from 'antd';
import styles from '../styles/Home.module.css'

const { Header, Content, Footer } = Layout;

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
      </Head>
      <Script src="/xterm.js" />

      <Layout className="layout">
        <Header>
          <div className="logo" />
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['2']}
            items={new Array(15).fill(null).map((_, index) => {
              const key = index + 1;
              return {
                key,
                label: `nav ${key}`,
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
            <Breadcrumb.Item>List</Breadcrumb.Item>
            <Breadcrumb.Item>App</Breadcrumb.Item>
          </Breadcrumb>
          <div className="site-layout-content">
            <div id="terminal" />
          </div>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
          }}
        >
          Ant Design ©2018 Created by Ant UED
        </Footer>
      </Layout>
    </div>
  )
}
