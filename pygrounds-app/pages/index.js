import { useState, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { Button, Breadcrumb, Layout, Menu } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import styles from '../styles/Home.module.css'
// import { WebLinksAddon } from 'xterm-addon-web-links';
// https://github.com/suren-atoyan/monaco-react
import Editor from "@monaco-editor/react";

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
    term.write(`Python ${msg}\r\n\r\n`);
  }

  function editorDidMount(editor, monaco) {
    console.log('editorDidMount', editor);
    editor.focus();
  }

  function onChange(newValue, e) {
    console.log('onChange', newValue, e);
  }

  function onRun() {
    console.log('Run');
  }

  useEffect(() => {
  }, []);

  const menus = [
    {key: "File", label: "File"},
    {key: "Edit", label: "Edit"},
    {key: "Run", label: "Run"},
  ]

  return (
    <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
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
            defaultSelectedKeys={['Run']}
            items={menus}
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
            <Breadcrumb.Item>Pygrounds</Breadcrumb.Item>
            <Breadcrumb.Item>Hello, World!</Breadcrumb.Item>
          </Breadcrumb>
          <div>
            <Row>
              <Col span={12}>
              <Editor
                height="100%"
                theme="vs-dark"
                defaultLanguage="python"
                defaultValue="print('hello, world')"
              />
              </Col>
              <Col span={1}  justify="space-around" align="middle">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  shape='circle'
                  onClick={onRun} />
              </Col>
              <Col span={11}><div id="terminal" /></Col>
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
