import { useRef, useEffect, useState } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Link from 'next/link'
import { Button, Breadcrumb, Layout, Menu, Progress } from 'antd';
import { PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import styles from '../styles/Home.module.css'
// https://github.com/suren-atoyan/monaco-react
import dynamic from "next/dynamic"

const plainColors = {
  gray: (text) => text,
  red: (text) => text,
  bold: {
    yellow: (text) => text,
  },
}

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
})

const XTerm = dynamic(() => import("../components/xterm"), {
  ssr: false,
})

const { Header, Content, Footer } = Layout;

export default function Home() {
  const editorRef = useRef(null);
  const pyodideRef = useRef(null);
  const xtermRef = useRef(null);
  const colorsRef = useRef(plainColors);
  var startTime = useRef(null);
  var stopTime = useRef(null);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const progressTimer = useRef(null);

  useEffect(() => {
    let active = true;

    import('ansi-colors')
      .then((mod) => {
        if (active) {
          colorsRef.current = mod.default ?? mod;
        }
      })
      .catch(() => {
        colorsRef.current = plainColors;
      });

    return () => {
      active = false;
    };
  }, []);

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

  function startProgressTimer() {
    progressTimer.current = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 0.5;
      });
    }, 200);
  }

  function stopProgressTimer() {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  async function pyodideLoaded() {
    stopTime = new Date();
    const elasped = stopTime - startTime;

    console.log(`Pyodide ready: ${ elasped }ms`)
    setLoadProgress(50);
    startProgressTimer();
    try {
      // https://pyodide.org/en/stable/usage/quickstart.html
      pyodideRef.current = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/",
        stdout: stdout,
        stderr: stderr
      });
      // Pyodide is now ready to use...
      var msg = pyodideRef.current.runPython(`
        import sys
        sys.version
      `);
      stopProgressTimer();
      setLoadProgress(100);
      var pymsg = `\r\nPyodide loaded in ${ elasped }ms.`;
      xtermRef.current.write(colorsRef.current.gray(pymsg));
      pymsg = `\r\nPython ${msg}\r\n\r\n`;
      xtermRef.current.write(colorsRef.current.bold.yellow(pymsg));
      setTimeout(() => setPyodideLoading(false), 300);
    } catch (e) {
      stopProgressTimer();
      console.log(e.message)
    }
  }

  async function onRun() {
    if (!pyodideRef.current) {
      xtermRef.current.write(colorsRef.current.red("\r\nPyodide is not ready yet, please wait...\r\n"));
      return;
    }

    const code = editorRef.current.getValue();
    startTime = new Date();
    xtermRef.current.write(colorsRef.current.gray("\r\nLoading imports..."))
    await pyodideRef.current.loadPackagesFromImports(code);
    stopTime = new Date()
    const elasped = stopTime - startTime;
    xtermRef.current.write(colorsRef.current.gray(`\r\nLoading imports done: ${ elasped }ms.\r\n`))
    try {
      await pyodideRef.current.runPython(code);
    } catch (e) {
      // console.log([e, e.message, e.stack]);
      xtermRef.current.write(colorsRef.current.red(`\r\n${e.message}\r\n`));
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
  startProgressTimer();

  return (
    <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
      </Head>
      <Script src="https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.js"
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
          <div style={{position: 'relative'}}>
            {pyodideLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
              }}>
                <LoadingOutlined style={{fontSize: 32, color: '#1677ff', marginBottom: 16}} />
                <div style={{color: '#fff', marginBottom: 16, fontSize: 14}}>
                  Loading Pyodide...
                </div>
                <Progress
                  percent={Math.round(loadProgress)}
                  style={{width: '60%'}}
                  status="active"
                />
              </div>
            )}
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
                  disabled={pyodideLoading}
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
          <p><b>Pygrounds</b> ©2026 &#10084;&#65039; by <a href="https://twitter.com/twinsant"><u>twinsant</u></a></p>
          <p style={{color: 'gray'}}>Powered with Pyodide & Monaco Editor</p>
        </Footer>
      </Layout>
    </div>
  )
}
