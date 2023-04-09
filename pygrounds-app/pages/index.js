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
import colors from 'ansi-colors';

const XTerm = dynamic(() => import("../components/xterm"), {
  ssr: false,
})

const { Header, Content, Footer } = Layout;

export default function Home() {
  const editorRef = useRef(null);
  var pyodideRef = useRef(null);
  const xtermRef = useRef(null);
  var startTime = useRef(null);
  var stopTime = useRef(null);

  function stdout(msg) {
    var output = `\r\n${msg}`
    // if (msg == 'Python initialization complete') {
    //   output = colors.gray(`\r\n${msg}`)
    // }
    xtermRef.current.write(output);
  }

  function stderr(msg) {
    xtermRef.current.write(`\r\n${msg}`);
  }

  function xtermLoaded(xterm) {
    xtermRef.current = xterm;
  }

  async function pyodideLoadError(e) {
    console.log("Pyodide load error", e);
  }

  async function pyodideLoaded() {
    stopTime = new Date();
    const elasped = stopTime - startTime;

    console.log(`Pyodide ready: ${ elasped }ms`)
    try {
      // https://pyodide.org/en/stable/usage/quickstart.html
      pyodideRef = await loadPyodide({stdout: stdout, stderr: stderr});
      // Pyodide is now ready to use...
      var msg = pyodideRef.runPython(`
        import sys
        sys.version
      `);
      var pymsg = `\r\nPyodide loaded in ${ elasped }ms.`;
      xtermRef.current.write(colors.gray(pymsg));
      pymsg = `\r\nPython ${msg}\r\n\r\n`;
      xtermRef.current.write(colors.bold.yellow(pymsg));
    } catch (e) {
      console.log(e.message)
    }
  }

  async function onRun() {
    console.log(xtermRef.current.term);

    const code = editorRef.current.getValue();
    startTime = new Date();
    xtermRef.current.write(colors.gray("\r\nLoading imports..."))
    await pyodideRef.loadPackagesFromImports(code);
    stopTime = new Date()
    const elasped = stopTime - startTime;
    xtermRef.current.write(colors.gray(`\r\nLoading imports done: ${ elasped }ms.\r\n`))
    try {
      await pyodideRef.runPython(code);
    } catch (e) {
      // console.log([e, e.message, e.stack]);
      xtermRef.current.write(colors.red(`\r\n${e.message}\r\n`));
    }
  }

  function editorDidMount(editor, monaco) {
    editor.focus();
    editorRef.current = editor; 
  }

  const menus = [
    {key: "m1", label: <Link href="https://github.com/twinsant/Pygrounds">Github</Link>},
  ]

  startTime = new Date();

  return (
    <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
      </Head>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.23.0/full/pyodide.js"
      {/* <Script src="/pyodide-v0.23.0/pyodide.js" */}
        onLoad={pyodideLoaded} 
        onError={pyodideLoadError}
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
                options={{minimap: false}}
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
