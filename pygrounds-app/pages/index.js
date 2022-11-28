import { useRef, useState, useEffect } from 'react'
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
  var termRef = useRef(null);
  const editorRef = useRef(null);
  var pyodideRef = useRef(null);
  var welcome = null;

  function termLoaded() {
    console.log("xterm ready.");
    try {
      termRef = new Terminal();
      // terminal.loadAddon(new WebLinksAddon());
      termRef.open(document.getElementById('terminal'));
      termRef.write('Loading \x1B[1;3;31mPygrounds v0.1\x1B[0m ... \r\n')
      if (welcome) {
        termRef.write(welcome);
        welcome = null;
      }
    } catch (e) {
      console.log(e);
    }
  }

  function stdout(msg) {
    termRef.write(`${msg}\r\n`);
  }

  async function pyodideLoaded() {
    console.log('pyodide ready.')
    // https://pyodide.org/en/stable/usage/quickstart.html
    try {
      pyodideRef = await loadPyodide({stdout: stdout});
      // Pyodide is now ready to use...
      var msg = pyodideRef.runPython(`
        import sys
        sys.version
      `);
      const pymsg = `Python ${msg}\r\n\r\n`;
      if (termRef) {
        termRef.write(pymsg);
      } else {
        welcome = pymsg;
      }
    } catch (e) {
      console.log(e)
    }
  }

  function editorDidMount(editor, monaco) {
    editor.focus();
  }

  function onChange(newValue, e) {
    console.log('onChange', newValue, e);
  }

  async function onRun() {
    const code = editorRef.current.getValue();
    const output = await pyodideRef.runPython(code);
    // console.log(`output: ${output}`)
  }

  function editorDidMount(editor, monaco) {
    editor.focus();
    editorRef.current = editor; 
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
      onLoad={termLoaded}/>
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
                onMount={editorDidMount}
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
