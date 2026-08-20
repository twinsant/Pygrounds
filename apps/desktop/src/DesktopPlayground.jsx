import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { BrowserFileStorage } from '@pygrounds/file-storage'
import { PyodideRuntime } from '@pygrounds/python-runtime'
import '@xterm/xterm/css/xterm.css'

const HOME_DIRECTORY = '/home/pygrounds'
const INITIAL_FILE_PATH = `${HOME_DIRECTORY}/unamed.py`

export default function DesktopPlayground() {
  const editorRef = useRef(null)
  const terminalRef = useRef(null)
  const runtimeRef = useRef(null)
  const runtimeLoadRef = useRef(null)
  const storageRef = useRef(null)
  const inputResolversRef = useRef([])
  const inputRef = useRef('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fileName, setFileName] = useState('unamed.py')
  const [files, setFiles] = useState([])

  const storage = () => {
    if (!storageRef.current) storageRef.current = new BrowserFileStorage()
    return storageRef.current
  }

  const write = (text) => terminalRef.current?.write(text)
  const prompt = () => write('\r\n$ ')

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      theme: { background: '#111827', foreground: '#d1d5db' },
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(document.getElementById('desktop-terminal'))
    fit.fit()
    terminalRef.current = terminal
    terminal.write('Pygrounds desktop\r\nLoading Python runtime...\r\n')

    terminal.onData((data) => {
      if (data === '\r') {
        const command = inputRef.current
        inputRef.current = ''
        terminal.write('\r\n')
        handleCommand(command)
      } else if (data === '\u007f' && inputRef.current) {
        inputRef.current = inputRef.current.slice(0, -1)
        terminal.write('\b \b')
      } else if (data === '\u0003') {
        inputRef.current = ''
        terminal.write('^C')
        prompt()
      } else if (!data.startsWith('\u001b')) {
        inputRef.current += data
        terminal.write(data)
      }
    })

    return () => terminal.dispose()
  }, [])

  useEffect(() => {
    if (runtimeLoadRef.current) return

    setFiles(listFiles())
    const runtime = new PyodideRuntime({
      indexURL: '/pyodide/',
      fallbackURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/',
      stdout: (message) => write(`\r\n${message}`),
      stderr: (message) => write(`\r\n${message}`),
      stdin: (promptText) => requestInput(promptText),
    })
    runtimeLoadRef.current = runtime.load()
    runtimeLoadRef.current
      .then(() => {
        runtimeRef.current = runtime
        setReady(true)
        setLoading(false)
        write('Python runtime ready\r\n$ ')
      })
      .catch((error) => {
        setLoading(false)
        write(`\r\nFailed to load Pyodide: ${error.message}\r\n`)
      })
  }, [])

  function requestInput(text = '') {
    write(text)
    return new Promise((resolve) => inputResolversRef.current.push(resolve))
  }

  function listFiles() {
    const prefix = `${HOME_DIRECTORY}/`
    return storage().keys()
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .filter(Boolean)
      .sort()
  }

  function saveFile() {
    if (!editorRef.current) return
    storage().setItem(`${HOME_DIRECTORY}/${fileName}`, editorRef.current.getValue())
    setFiles(listFiles())
    write(`\r\nSaved ${fileName}`)
    prompt()
  }

  function openFile(nextFileName) {
    const content = storage().getItem(`${HOME_DIRECTORY}/${nextFileName}`)
    if (content === null) return
    editorRef.current?.setValue(content)
    setFileName(nextFileName)
    write(`\r\nOpened ${nextFileName}`)
    prompt()
  }

  async function runCode(code) {
    if (!runtimeRef.current) {
      write('\r\nPython runtime is not ready')
      prompt()
      return
    }
    try {
      await runtimeRef.current.loadPackagesFromImports(code)
      await runtimeRef.current.runPythonAsync(code)
    } catch (error) {
      write(`\r\n${error.message}`)
    }
    prompt()
  }

  function handleCommand(command) {
    const inputResolver = inputResolversRef.current.shift()
    if (inputResolver) {
      inputResolver(command)
      return
    }
    if (command === 'clear') {
      terminalRef.current?.clear()
      write('$ ')
    } else if (command === 'python' || command === 'python3') {
      write('Python REPL is available through the editor; use Run to execute code.')
      prompt()
    } else if (command === 'ls') {
      write(`\r\n${listFiles().join('  ')}`)
      prompt()
    } else if (command === 'pwd') {
      write(`\r\n${HOME_DIRECTORY}`)
      prompt()
    } else if (command) {
      write(`\r\n${command}: command not found`)
      prompt()
    } else {
      prompt()
    }
  }

  return (
    <main className="desktop-playground">
      <header className="desktop-header">
        <strong>Pygrounds</strong>
        <span>{loading ? 'Loading Python...' : ready ? 'Python ready' : 'Runtime unavailable'}</span>
        <button type="button" onClick={saveFile}>Save</button>
        <select value="" onChange={(event) => openFile(event.target.value)} aria-label="Open file">
          <option value="">Open file</option>
          {files.map((file) => <option key={file} value={file}>{file}</option>)}
        </select>
      </header>
      <section className="desktop-workspace">
        <div className="desktop-editor">
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} aria-label="File name" />
          <Editor
            height="calc(100% - 38px)"
            theme="vs-dark"
            language="python"
            defaultValue={storage().getItem(INITIAL_FILE_PATH) ?? "print('hello, world')"}
            onMount={(editor) => { editorRef.current = editor }}
            options={{ minimap: { enabled: false }, automaticLayout: true }}
          />
        </div>
        <div className="desktop-output">
          <button type="button" disabled={!ready} onClick={() => runCode(editorRef.current?.getValue() ?? '')}>Run</button>
          <div id="desktop-terminal" />
        </div>
      </section>
    </main>
  )
}
