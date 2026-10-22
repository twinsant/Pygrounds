// components/terminal-component
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import colors from 'ansi-colors';
import '@xterm/xterm/css/xterm.css';
import { useTheme } from './ThemeProvider';
import { getTerminalTheme } from '../lib/theme';
import { useLanguage } from './LanguageProvider';

function XTerm(props) {
  const inputRef = useRef('');
  const terminalRef = useRef(null);
  const containerRef = useRef(null);
  const callbacksRef = useRef(props);
  const { mode } = useTheme();
  const { language, t } = useLanguage();
  const modeRef = useRef(mode);

  useEffect(() => {
    callbacksRef.current = props;
  }, [props]);

  useEffect(() => {
    modeRef.current = mode;
    if (terminalRef.current) terminalRef.current.options.theme = getTerminalTheme(mode);
  }, [mode]);

  useEffect(() => {
    terminalRef.current?.textarea?.setAttribute('aria-label', t('terminal.input'));
  }, [language, t]);

    useEffect(() => {
            const term = new Terminal({
                allowProposedApi: true,
                cursorStyle: 'underline',
                cursorBlink: true,
                windowsMode: true,
                convertEol: true,
                theme: getTerminalTheme(modeRef.current),
            })
            terminalRef.current = term;
            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.loadAddon(new WebLinksAddon());

            term.attachCustomKeyEventHandler(event => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
                inputRef.current = '';
                callbacksRef.current.onClear?.();
                return false;
              }
              return true;
            });

            term.onData(data => {
              if (data === '\t') {
                const completedInput = callbacksRef.current.onTabComplete?.(inputRef.current);
                if (completedInput && completedInput !== inputRef.current) {
                  const inputLength = Array.from(inputRef.current).length;
                  term.write('\b \b'.repeat(inputLength));
                  inputRef.current = completedInput;
                  term.write(completedInput);
                }
                return;
              }

              if (data === '\r') {
                const input = inputRef.current;
                inputRef.current = '';
                term.write('\r\n');
                callbacksRef.current.onSubmit?.(input);
                return;
                }

              if (data === '\u007f' || data === '\b') {
                if (inputRef.current.length > 0) {
                  const input = Array.from(inputRef.current);
                  input.pop();
                  inputRef.current = input.join('');
                  term.write('\b \b');
                }
                return;
              }

              if (data === '\u0003') {
                inputRef.current = '';
                term.write('^C\r\n');
                callbacksRef.current.onInterrupt?.();
                return;
              }

              if (!data.startsWith('\u001b')) {
                inputRef.current += data;
                term.write(data);
              }
              });
            term.open(containerRef.current);
            term.textarea?.setAttribute('aria-label', t('terminal.input'));
              try {
                term.loadAddon(new WebglAddon());
              } catch (error) {
                console.warn('WebGL renderer unavailable; using the default renderer.', error);
              }

            term.write(`${t('terminal.loading', { name: colors.bold('Pygrounds v2.0') })}\r\n`)
            fitAddon.fit();

            callbacksRef.current.onLoad(term);
            let resizeFrame;
            const observer = new ResizeObserver(() => {
              cancelAnimationFrame(resizeFrame);
              resizeFrame = requestAnimationFrame(() => {
                if (containerRef.current?.clientWidth && containerRef.current?.clientHeight) fitAddon.fit();
              });
            });
            observer.observe(containerRef.current);
            return () => {
              observer.disconnect();
              cancelAnimationFrame(resizeFrame);
              term.dispose();
              terminalRef.current = null;
            };
    }, []);

    return <div id="terminal" ref={containerRef} style={{width: '100%', height: '100%'}} />
}

export default XTerm