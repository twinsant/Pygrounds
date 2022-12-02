import { useRef, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Link from 'next/link'
import { Button, Breadcrumb, Layout, Menu } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import styles from '../styles/Home.module.css'
// https://github.com/suren-atoyan/monaco-react
import Editor from "@monaco-editor/react";
import dynamic from "next/dynamic"

const XTerm = dynamic(() => import("../components/xterm"), {
  ssr: false,
})

const { Header, Content, Footer } = Layout;

export default function Home() {
  const editorRef = useRef(null);
  var pyodideRef = useRef(null);
  const xtermRef = useRef(null);

  function stdout(msg) {
    xtermRef.current.write(`${msg}\r\n`);
  }

  function xtermLoaded(xterm) {
    xtermRef.current = xterm;
  }

  async function pyodideLoaded() {
    console.log('Pyodide ready.')
    // https://pyodide.org/en/stable/usage/quickstart.html
    pyodideRef = await loadPyodide({stdout: stdout});
    // Pyodide is now ready to use...
    var msg = pyodideRef.runPython(`
      import sys
      sys.version
    `);
    const pymsg = `\r\nPython ${msg}\r\n\r\n`;
    xtermRef.current.write(pymsg);
  }

  async function onRun() {
    console.log(xtermRef.current.term);

    const code = editorRef.current.getValue();
    await pyodideRef.runPython(code);
  }

  function editorDidMount(editor, monaco) {
    editor.focus();
    editorRef.current = editor; 
  }

  const menus = [
    {key: "m1", label: <Link href="https://github.com/twinsant/Pygrounds">Github</Link>},
  ]

  return (
    <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
      </Head>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js"
        onLoad={pyodideLoaded} 
      />

      <Layout className="layout">
        <Header>
          <div className="logo" />
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['m1']}
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
              <Col span={11}>
                <XTerm onLoad={xtermLoaded}/>
              </Col>
            </Row>
          </div>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
          }}
        >
          <p><b>Pygrounds</b> ©2022 &#10084;&#65039; by <a href="https://twitter.com/twinsant"><u>twinsant</u></a></p>
          <p style={{color: 'gray'}}>Powered with Pyodide & Monaco Editor</p>
        </Footer>
      </Layout>
    </div>
  )
}
