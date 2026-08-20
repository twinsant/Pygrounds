import { useRef, useEffect, useState } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Link from 'next/link'
import { Button, Breadcrumb, Layout, Menu, Progress } from 'antd';
import { PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import styles from '../styles/Home.module.css'
import { PlaygroundShell } from '@pygrounds/app-ui'
import { BrowserFileStorage } from '@pygrounds/file-storage'
import { PyodideRuntime } from '@pygrounds/python-runtime'
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
const HOME_DIRECTORY = '/home/pygrounds';
const INITIAL_FILE_PATH = `${HOME_DIRECTORY}/unamed.py`;

export default function Home() {
  const editorRef = useRef(null);
  const currentFilePathRef = useRef(INITIAL_FILE_PATH);
  const vimStatusRef = useRef(null);
  const vimModeRef = useRef(null);
  const pyodideRef = useRef(null);
  const fileStorageRef = useRef(null);
  const xtermRef = useRef(null);
  const terminalModeRef = useRef('shell');
  const replBufferRef = useRef([]);
  const inputResolversRef = useRef([]);
  const colorsRef = useRef(plainColors);
  var startTime = useRef(null);
  var stopTime = useRef(null);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [virtualFiles, setVirtualFiles] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('unamed.py');
  const [editingFileName, setEditingFileName] = useState(false);
  const progressTimer = useRef(null);

  function fileStorage() {
    if (!fileStorageRef.current) {
      fileStorageRef.current = new BrowserFileStorage();
    }
    return fileStorageRef.current;
  }

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

  useEffect(() => {
    setVirtualFiles(listVirtualHomeFiles());
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

  function terminalPrompt() {
    return terminalModeRef.current === 'repl' ? '>>> ' : '$ ';
  }

  function writeTerminalPrompt(newLine = false) {
    xtermRef.current.write(`${newLine ? '\r\n' : ''}${terminalPrompt()}`);
  }

  function requestTerminalInput(prompt = '') {
    if (prompt) {
      xtermRef.current.write(prompt);
    }
    return new Promise(resolve => {
      inputResolversRef.current.push(resolve);
    });
  }

  function preparePythonCode(code) {
    if (!/\binput\s*\(/.test(code)) {
      return code;
    }

    return `from js import __pygrounds_input\n${code.replace(/\binput\s*\(/g, 'await __pygrounds_input(')}`;
  }

  async function onTerminalSubmit(code) {
    const inputResolver = inputResolversRef.current.shift();
    if (inputResolver) {
      inputResolver(code);
      return;
    }

    const command = code.trim();

    if (terminalModeRef.current === 'shell') {
      if (command === 'python' || command === 'python3') {
        terminalModeRef.current = 'repl';
        replBufferRef.current = [];
        xtermRef.current.write('Python REPL\r\n>>> ');
      } else if (command === 'clear') {
        xtermRef.current.reset();
        writeTerminalPrompt();
      } else if (command === 'pwd') {
        xtermRef.current.write(`${HOME_DIRECTORY}\r\n`);
        writeTerminalPrompt();
      } else if (command === 'ls' || command.startsWith('ls ')) {
        const requestedPath = command.slice(2).trim();
        if (requestedPath && virtualFilePath(requestedPath) !== HOME_DIRECTORY) {
          xtermRef.current.write(`ls: ${requestedPath}: No such directory\r\n`);
        } else {
          const files = listVirtualHomeFiles();
          if (files.length > 0) {
            xtermRef.current.write(`${files.join('  ')}\r\n`);
          }
        }
        writeTerminalPrompt();
      } else if (command === 'mv' || command.startsWith('mv ')) {
        const renameParts = command.split(/\s+/).slice(1);
        if (renameParts.length !== 2) {
          xtermRef.current.write('Usage: mv <old-name> <new-name>\r\n');
          writeTerminalPrompt();
        } else {
          renameVirtualFile(renameParts[0], renameParts[1]);
        }
      } else if (command === 'open' || command.startsWith('open ')) {
        const fileName = command.slice(4).trim();
        if (!fileName) {
          xtermRef.current.write('Usage: open <file>\r\n');
          writeTerminalPrompt();
        } else {
          openVirtualFile(fileName);
        }
      } else if (command === 'help' || command === '?') {
        xtermRef.current.write(
          'Available commands:\r\n' +
          '  help, ?       Show this help message\r\n' +
          '  python         Enter the Python REPL\r\n' +
          '  python3        Enter the Python REPL\r\n' +
          '  clear          Clear the terminal\r\n' +
          '  pwd            Show the current home directory\r\n' +
          '  ls             List files in the home directory\r\n' +
          '  mv <old> <new> Rename a file in the home directory\r\n' +
          '  open <file>    Open a file from the home directory\r\n'
        );
        writeTerminalPrompt();
      } else if (command) {
        xtermRef.current.write(`${command}: command not found\r\n`);
        writeTerminalPrompt();
      } else {
        writeTerminalPrompt();
      }
      return;
    }

    if (command === 'exit()' || command === 'quit()' || command === 'exit' || command === 'quit') {
      terminalModeRef.current = 'shell';
      replBufferRef.current = [];
      xtermRef.current.write('exit\r\n');
      writeTerminalPrompt();
      return;
    }

    if (!command) {
      if (replBufferRef.current.length > 0) {
        const codeToRun = replBufferRef.current.join('\n');
        replBufferRef.current = [];
        if (!pyodideRef.current) {
          xtermRef.current.write('Pyodide is not ready yet, please wait...\r\n');
          writeTerminalPrompt(true);
          return;
        }
        try {
          await pyodideRef.current.runPythonAsync(preparePythonCode(codeToRun));
        } catch (e) {
          xtermRef.current.write(`\r\n${e.message}\r\n`);
        }
        writeTerminalPrompt(true);
        return;
      }
      writeTerminalPrompt();
      return;
    }

    if (replBufferRef.current.length > 0 || /:\s*(#.*)?$/.test(command)) {
      const continuationCode = replBufferRef.current.length > 0 && /^\S/.test(code)
        ? `    ${code}`
        : code;
      replBufferRef.current.push(continuationCode);
      xtermRef.current.write('...     ');
      return;
    }

    if (!pyodideRef.current) {
      xtermRef.current.write('Pyodide is not ready yet, please wait...\r\n');
      writeTerminalPrompt();
      return;
    }

    try {
      await pyodideRef.current.runPythonAsync(preparePythonCode(code));
    } catch (e) {
      xtermRef.current.write(`\r\n${e.message}\r\n`);
    }
    writeTerminalPrompt(true);
  }

  function onTerminalInterrupt() {
    writeTerminalPrompt();
  }

  function onTerminalClear() {
    xtermRef.current.reset();
    writeTerminalPrompt();
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
      pyodideRef.current = await new PyodideRuntime({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/",
        stdout: stdout,
        stderr: stderr,
        stdin: () => null
      }).load();
      globalThis.__pygrounds_input = requestTerminalInput;
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
      writeTerminalPrompt();
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
      await pyodideRef.current.runPythonAsync(preparePythonCode(code));
    } catch (e) {
      // console.log([e, e.message, e.stack]);
      xtermRef.current.write(colorsRef.current.red(`\r\n${e.message}\r\n`));
    }
    writeTerminalPrompt(true);
  }

  async function editorDidMount(editor) {
    editor.focus();
    editorRef.current = editor; 
    editor.onKeyDown(event => {
      const browserEvent = event.browserEvent;
      if ((browserEvent.metaKey || browserEvent.ctrlKey) && browserEvent.key.toLowerCase() === 's') {
        browserEvent.preventDefault();
        browserEvent.stopPropagation();
        saveEditorToHome();
      }
    });
    const savedCode = fileStorage().getItem(INITIAL_FILE_PATH);
    if (savedCode !== null) {
      editor.setValue(savedCode);
    }
    const { initVimMode } = await import('monaco-vim');
    vimModeRef.current = initVimMode(editor, vimStatusRef.current);
  }

  function saveEditorToHome() {
    if (!editorRef.current) {
      return;
    }

    const code = editorRef.current.getValue();
    const filePath = currentFilePathRef.current;
    fileStorage().setItem(filePath, code);
    setVirtualFiles(listVirtualHomeFiles());
    xtermRef.current?.write(`\r\nSaved ${filePath}\r\n`);
    if (xtermRef.current) {
      writeTerminalPrompt(true);
    }
  }

  function virtualFilePath(fileName) {
    const normalizedName = fileName.trim();
    if (normalizedName.startsWith(`${HOME_DIRECTORY}/`)) {
      return normalizedName;
    }
    return `${HOME_DIRECTORY}/${normalizedName}`;
  }

  function listVirtualHomeFiles() {
    const prefix = `${HOME_DIRECTORY}/`;
    return fileStorage().keys()
      .filter(key => key.startsWith(prefix))
      .map(key => key.slice(prefix.length))
      .filter(fileName => fileName && !fileName.includes('/'))
      .sort();
  }

  function openVirtualFile(fileName) {
    const filePath = virtualFilePath(fileName);
    const savedCode = fileStorage().getItem(filePath);
    if (savedCode === null) {
      xtermRef.current.write(`\r\nopen: ${fileName}: No such file\r\n`);
      writeTerminalPrompt(true);
      return;
    }

    editorRef.current?.setValue(savedCode);
    currentFilePathRef.current = filePath;
    setCurrentFileName(filePath.split('/').pop());
    xtermRef.current.write(`\r\nOpened ${filePath}\r\n`);
    writeTerminalPrompt(true);
  }

  function renameVirtualFile(sourceName, targetName) {
    const sourcePath = virtualFilePath(sourceName);
    const targetPath = virtualFilePath(targetName);
    const savedCode = fileStorage().getItem(sourcePath);
    if (savedCode === null) {
      xtermRef.current.write(`\r\nmv: ${sourceName}: No such file\r\n`);
    } else if (fileStorage().getItem(targetPath) !== null) {
      xtermRef.current.write(`\r\nmv: ${targetName}: File exists\r\n`);
    } else {
      fileStorage().setItem(targetPath, savedCode);
      fileStorage().removeItem(sourcePath);
      if (currentFilePathRef.current === sourcePath) {
        currentFilePathRef.current = targetPath;
        setCurrentFileName(targetPath.split('/').pop());
      }
      setVirtualFiles(listVirtualHomeFiles());
      xtermRef.current.write(`\r\nRenamed ${sourcePath} to ${targetPath}\r\n`);
    }
    writeTerminalPrompt(true);
  }

  function commitFileName() {
    const nextFileName = currentFileName.trim();
    setEditingFileName(false);
    if (!nextFileName || nextFileName === currentFilePathRef.current.split('/').pop()) {
      return;
    }
    renameVirtualFile(currentFilePathRef.current, nextFileName);
  }

  function completeTerminalInput(input) {
    if (terminalModeRef.current !== 'shell') {
      return input;
    }

    const openMatch = input.match(/^open\s+([^\s]*)$/);
    if (openMatch) {
      const fileName = openMatch[1];
      const match = listVirtualHomeFiles().find(candidate => candidate.startsWith(fileName));
      return match ? `open ${match}` : input;
    }

    const shellCommands = ['clear', 'help', 'ls', 'mv', 'open', 'pwd', 'python', 'python3'];
    const match = shellCommands.find(command => command.startsWith(input));
    return match ?? input;
  }

  const menus = [
    {
      key: "file",
      label: "File",
      children: [
        {key: "save", label: "Save"},
        {
          key: "open",
          label: "Open",
          children: virtualFiles.length > 0
            ? virtualFiles.map(fileName => ({key: `open:${fileName}`, label: fileName}))
            : [{key: 'open-empty', label: 'No files', disabled: true}],
        },
      ],
    },
    {key: "m1", label: <Link href="https://github.com/twinsant/Pygrounds">Github</Link>},
  ]

  startTime = new Date();
  startProgressTimer();

  return (
    <PlaygroundShell>
      <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content="Best online Python playgrounds." />
      </Head>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js"
        onLoad={pyodideLoaded} 
        onError={pyodideLoadError}
      />

      <Layout className="layout" style={{ minHeight: '100vh' }}>
        <Header style={{ height: 40, lineHeight: '40px', padding: '0 24px' }}>
          <div className="logo" />
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['m1']}
            items={menus}
            onClick={({ key }) => {
              if (key === 'save') {
                saveEditorToHome();
              } else if (key.startsWith('open:')) {
                openVirtualFile(key.slice(5));
              }
            }}
          />
        </Header>

        <Content
          style={{
            padding: '0 50px',
            height: 'calc(100vh - 98px)',
            overflow: 'hidden',
          }}
        >
          <Breadcrumb
            style={{
              margin: '8px 0',
            }}
          >
            <Breadcrumb.Item>Pygrounds</Breadcrumb.Item>
            <Breadcrumb.Item>
              {editingFileName ? (
                <input
                  autoFocus
                  value={currentFileName}
                  onChange={event => setCurrentFileName(event.target.value)}
                  onBlur={commitFileName}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      commitFileName();
                    }
                    if (event.key === 'Escape') {
                      setCurrentFileName(currentFilePathRef.current.split('/').pop());
                      setEditingFileName(false);
                    }
                  }}
                  style={{fontSize: 'inherit', border: '1px solid #1677ff', outline: 'none'}}
                />
              ) : (
                <span onClick={() => setEditingFileName(true)} style={{cursor: 'text'}}>
                  {currentFileName}
                </span>
              )}
            </Breadcrumb.Item>
          </Breadcrumb>
          <div style={{position: 'relative', height: 'calc(100% - 38px)'}}>
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
            <Row style={{height: '100%'}}>
              <Col span={12} style={{height: '100%', display: 'flex'}}>
              <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
                <Editor
                  height="calc(100% - 24px)"
                  theme="vs-dark"
                  defaultLanguage="python"
                  options={{minimap: false}}
                  defaultValue="print('hello, world')"
                  onMount={editorDidMount}
                />
                <div
                  ref={vimStatusRef}
                  style={{
                    height: 24,
                    padding: '2px 8px',
                    background: '#252526',
                    color: '#cccccc',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                />
              </div>
              </Col>
              <Col
                span={1}
                style={{
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  shape='circle'
                  disabled={pyodideLoading}
                  onClick={onRun} />
              </Col>
              <Col span={11} style={{height: '100%', display: 'flex'}}>
                <XTerm onLoad={xtermLoaded} onSubmit={onTerminalSubmit} onInterrupt={onTerminalInterrupt} onClear={onTerminalClear} onTabComplete={completeTerminalInput}/>
              </Col>
            </Row>
          </div>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
            padding: '8px 24px',
          }}
        >
          <p style={{margin: '2px 0'}}><b>Pygrounds</b> ©2026 &#10084;&#65039; by <a href="https://twitter.com/twinsant"><u>twinsant</u></a></p>
          <p style={{color: 'gray', margin: '2px 0'}}>Powered with Pyodide & Monaco Editor</p>
        </Footer>
      </Layout>
      </div>
    </PlaygroundShell>
  )
}
