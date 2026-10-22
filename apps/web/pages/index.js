import { useRef, useEffect, useState } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Link from 'next/link'
import { Button, Layout, Menu, Progress } from 'antd';
import { FileOutlined, MenuOutlined, PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import styles from '../styles/Home.module.css'
import { PlaygroundShell } from '@pygrounds/app-ui'
import { BrowserFileStorage } from '@pygrounds/file-storage'
import { PyodideRuntime } from '@pygrounds/python-runtime'
// https://github.com/suren-atoyan/monaco-react
import dynamic from "next/dynamic"
import AccountControl from '../components/AccountControl'
import AgentPanel from '../components/AgentPanel'
import { useAuth } from '../components/AuthProvider'
import { assertProposalTarget } from '../lib/agent'
import { useTheme } from '../components/ThemeProvider'
import ThemeToggle from '../components/ThemeToggle'
import { getMonacoTheme } from '../lib/theme'
import { useLanguage } from '../components/LanguageProvider'
import LanguageSelect from '../components/LanguageSelect'
import { LocalizedError } from '../lib/i18n'
import ResizeHandle from '../components/ResizeHandle'

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

function beforeEditorMount(monaco) {
  for (const mode of ['dark', 'light']) {
    monaco.editor.defineTheme(`pygrounds-${mode}`, getMonacoTheme(mode));
  }
}

export default function Home() {
  const { mode } = useTheme();
  const { t } = useLanguage();
  const { user, loading: authLoading, error: authError } = useAuth();
  const [agentOpen, setAgentOpen] = useState(true);
  const workspaceRef = useRef(null);
  const filePanelRef = useRef(null);
  const workbenchRef = useRef(null);
  const editorPanelRef = useRef(null);
  const consolePanelRef = useRef(null);
  const agentPanelRef = useRef(null);
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
  const startTime = useRef(null);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [virtualFiles, setVirtualFiles] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('unamed.py');
  const [editingFileName, setEditingFileName] = useState(false);
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false);
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
    startTime.current = Date.now();
    startProgressTimer();
    return stopProgressTimer;
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
          xtermRef.current.write(`${t('terminal.noDirectory', { path: requestedPath })}\r\n`);
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
          xtermRef.current.write(`${t('terminal.mvUsage')}\r\n`);
          writeTerminalPrompt();
        } else {
          renameVirtualFile(renameParts[0], renameParts[1]);
        }
      } else if (command === 'open' || command.startsWith('open ')) {
        const fileName = command.slice(4).trim();
        if (!fileName) {
          xtermRef.current.write(`${t('terminal.openUsage')}\r\n`);
          writeTerminalPrompt();
        } else {
          openVirtualFile(fileName);
        }
      } else if (command === 'help' || command === '?') {
        xtermRef.current.write(t('terminal.help'));
        writeTerminalPrompt();
      } else if (command) {
        xtermRef.current.write(`${t('terminal.unknownCommand', { command })}\r\n`);
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
          xtermRef.current.write(`${t('terminal.notReady')}\r\n`);
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
      xtermRef.current.write(`${t('terminal.notReady')}\r\n`);
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
    const elasped = Date.now() - startTime.current;

    console.log(`Pyodide ready: ${ elasped }ms`)
    setLoadProgress(50);
    startProgressTimer();
    try {
      // https://pyodide.org/en/stable/usage/quickstart.html
      pyodideRef.current = await new PyodideRuntime({
        indexURL: "/pyodide/",
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
      var pymsg = `\r\n${t('terminal.loaded', { ms: elasped })}`;
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
      xtermRef.current.write(colorsRef.current.red(`\r\n${t('terminal.notReady')}\r\n`));
      return;
    }

    const code = editorRef.current.getValue();
    const runStarted = Date.now();
    xtermRef.current.write(colorsRef.current.gray(`\r\n${t('terminal.imports')}`))
    await pyodideRef.current.loadPackagesFromImports(code);
    const elasped = Date.now() - runStarted;
    xtermRef.current.write(colorsRef.current.gray(`\r\n${t('terminal.importsDone', { ms: elasped })}\r\n`))
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

  function getAgentSnapshot() {
    if (!editorRef.current) throw new LocalizedError('agent.editorNotReady');
    return { path: currentFilePathRef.current, code: editorRef.current.getValue() };
  }

  function applyAgentProposal(snapshot, proposal) {
    assertProposalTarget(snapshot, getAgentSnapshot(), proposal);
    const editor = editorRef.current;
    editor.pushUndoStop();
    editor.executeEdits('agent', [{ range: editor.getModel().getFullModelRange(), text: proposal.code }]);
    editor.pushUndoStop();
    editor.focus();
  }

  function saveEditorToHome() {
    if (!editorRef.current) {
      return;
    }

    const code = editorRef.current.getValue();
    const filePath = currentFilePathRef.current;
    fileStorage().setItem(filePath, code);
    setVirtualFiles(listVirtualHomeFiles());
    xtermRef.current?.write(`\r\n${t('terminal.saved', { path: filePath })}\r\n`);
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
    if (filePath === currentFilePathRef.current) {
      return;
    }
    const savedCode = fileStorage().getItem(filePath);
    if (savedCode === null) {
      xtermRef.current.write(`\r\n${t('terminal.noFile', { command: 'open', path: fileName })}\r\n`);
      writeTerminalPrompt(true);
      return;
    }

    editorRef.current?.setValue(savedCode);
    currentFilePathRef.current = filePath;
    setCurrentFileName(filePath.split('/').pop());
    xtermRef.current.write(`\r\n${t('terminal.opened', { path: filePath })}\r\n`);
    writeTerminalPrompt(true);
  }

  function renameVirtualFile(sourceName, targetName) {
    const sourcePath = virtualFilePath(sourceName);
    const targetPath = virtualFilePath(targetName);
    const savedCode = fileStorage().getItem(sourcePath);
    if (savedCode === null) {
      xtermRef.current.write(`\r\n${t('terminal.noFile', { command: 'mv', path: sourceName })}\r\n`);
    } else if (fileStorage().getItem(targetPath) !== null) {
      xtermRef.current.write(`\r\n${t('terminal.fileExists', { path: targetName })}\r\n`);
    } else {
      fileStorage().setItem(targetPath, savedCode);
      fileStorage().removeItem(sourcePath);
      if (currentFilePathRef.current === sourcePath) {
        currentFilePathRef.current = targetPath;
        setCurrentFileName(targetPath.split('/').pop());
      }
      setVirtualFiles(listVirtualHomeFiles());
      xtermRef.current.write(`\r\n${t('terminal.renamed', { source: sourcePath, target: targetPath })}\r\n`);
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
      label: t('home.file'),
      children: [
        {key: "save", label: t('home.save')},
        {
          key: "open",
          label: t('home.open'),
          children: virtualFiles.length > 0
            ? virtualFiles.map(fileName => ({key: `open:${fileName}`, label: fileName}))
            : [{key: 'open-empty', label: t('home.noFiles'), disabled: true}],
        },
      ],
    },
    {key: "m1", label: <Link href="https://github.com/twinsant/Pygrounds">Github</Link>},
  ]

  const displayedFiles = Array.from(new Set([
    currentFilePathRef.current.split('/').pop(),
    ...virtualFiles,
  ]))

  return (
    <PlaygroundShell>
      <div className={styles.container}>
      <Head>
        <title>Pygrounds</title>
        <meta name="description" content={t('home.description')} />
      </Head>
      <Script src="/pyodide/pyodide.js"
        onLoad={pyodideLoaded} 
        onError={pyodideLoadError}
      />

      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            aria-label={t('home.openFiles')}
            aria-expanded={fileDrawerOpen}
            aria-controls="local-files-panel"
            onClick={() => { setFileDrawerOpen(open => !open); setAgentOpen(false); }}
            className={styles.mobileFilesButton}
          />
          <Menu
            className={styles.topMenu}
            mode="horizontal"
            style={{ flex: 1, minWidth: 0 }}
            selectedKeys={[]}
            items={menus}
            onClick={({ key }) => {
              if (key === 'save') {
                saveEditorToHome();
              } else if (key.startsWith('open:')) {
                openVirtualFile(key.slice(5));
              }
            }}
          />
          <Button type="text" aria-controls="agent-panel" aria-expanded={agentOpen}
            onClick={() => { setAgentOpen(open => !open); setFileDrawerOpen(false); }}>
            {t('agent.title')}
          </Button>
          <ThemeToggle />
          <LanguageSelect />
          <AccountControl />
        </Header>

        <Content ref={workspaceRef} className={`${styles.workspace} ${agentOpen ? styles.withAgent : ''} ${fileDrawerOpen ? styles.drawerOpen : ''}`} style={{ minHeight: 0 }}>
          {fileDrawerOpen && (
            <button
              type="button"
              className={styles.drawerBackdrop}
              aria-label={t('home.closeFiles')}
              onClick={() => setFileDrawerOpen(false)}
            />
          )}
          <aside ref={filePanelRef} id="local-files-panel" className={styles.filePanel} aria-label={t('home.localFiles')}>
            <div className={styles.panelHeading}>{t('home.localFiles')}</div>
            <div className={styles.fileList}>
              {displayedFiles.length > 0 ? displayedFiles.map(fileName => (
                <button
                  key={fileName}
                  type="button"
                  className={`${styles.fileItem} ${fileName === currentFilePathRef.current.split('/').pop() ? styles.activeFile : ''}`}
                  onClick={() => {
                    openVirtualFile(fileName);
                    setFileDrawerOpen(false);
                  }}
                >
                  <FileOutlined />
                  <span>{fileName}</span>
                </button>
              )) : (
                <div className={styles.emptyFiles}>{t('home.noLocalFiles')}</div>
              )}
            </div>
          </aside>

          <ResizeHandle label={t('panels.files')} controls="local-files-panel"
            containerRef={workspaceRef} targetRef={filePanelRef} adjacentRef={workbenchRef}
            property="--file-width" className={styles.fileResizeHandle} />
          <main ref={workbenchRef} className={styles.workbench}>
            {pyodideLoading && (
              <div className={styles.loadingOverlay}>
                <LoadingOutlined className={styles.loadingIcon} />
                <div className={styles.loadingLabel}>
                  {t('home.loading')}
                </div>
                <Progress
                  percent={Math.round(loadProgress)}
                  style={{width: '60%'}}
                  status="active"
                />
              </div>
            )}
            <section ref={editorPanelRef} id="editor-panel" className={styles.editorPanel}>
              <div className={styles.panelToolbar}>
                <div className={styles.currentFile}>
                  <FileOutlined />
                  {editingFileName ? (
                    <input
                      autoFocus
                      aria-label={t('home.rename')}
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
                    />
                  ) : (
                    <button type="button" title={t('home.rename')} onClick={() => setEditingFileName(true)}>
                      {currentFileName}
                    </button>
                  )}
                </div>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  disabled={pyodideLoading}
                  onClick={onRun}
                >
                  {t('home.run')}
                </Button>
              </div>
              <div className={styles.editorViewport}>
                <Editor
                  height="100%"
                  theme={`pygrounds-${mode}`}
                  beforeMount={beforeEditorMount}
                  defaultLanguage="python"
                  loading={t('home.editor')}
                  options={{minimap: false, ariaLabel: t('home.editor')}}
                  defaultValue="print('hello, world')"
                  onMount={editorDidMount}
                />
              </div>
              <div ref={vimStatusRef} className={styles.vimStatus} />
            </section>
            <ResizeHandle label={t('panels.editorConsole')} controls="editor-panel console-panel"
              orientation="horizontal" minimum={180} adjacentMinimum={140}
              containerRef={workbenchRef} targetRef={editorPanelRef} adjacentRef={consolePanelRef}
              property="--editor-height" />
            <section ref={consolePanelRef} id="console-panel" className={styles.consolePanel}>
              <div className={styles.panelHeading}>{t('home.console')}</div>
              <div className={styles.terminalViewport}>
                <XTerm onLoad={xtermLoaded} onSubmit={onTerminalSubmit} onInterrupt={onTerminalInterrupt} onClear={onTerminalClear} onTabComplete={completeTerminalInput}/>
              </div>
            </section>
          </main>
          <ResizeHandle label={t('panels.agent')} controls="agent-panel" hidden={!agentOpen}
            containerRef={workspaceRef} targetRef={agentPanelRef} adjacentRef={workbenchRef}
            property="--agent-width" minimum={240} reverse className={styles.agentResizeHandle} />
          <AgentPanel panelRef={agentPanelRef} key={user && !authLoading && !authError ? user.id : 'guest'} open={agentOpen} onClose={() => setAgentOpen(false)}
            getSnapshot={getAgentSnapshot} applyProposal={applyAgentProposal} />
        </Content>
        <Footer className={styles.footer}>
          <p style={{margin: 0}}><b>Pygrounds</b> ©2026 &#10084;&#65039; {t('home.by')} <a href="https://twitter.com/twinsant"><u>twinsant</u></a> · {t('home.poweredBy')}</p>
        </Footer>
      </Layout>
      </div>
    </PlaygroundShell>
  )
}
