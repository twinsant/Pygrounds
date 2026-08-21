// components/terminal-component
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import colors from 'ansi-colors';
import '@xterm/xterm/css/xterm.css';

function XTerm(props) {
  const inputRef = useRef('');

    useEffect(() => {
        async function initTerminal() {
            console.log(colors.yellow("XTerm loaded"))
            const term = new Terminal({
                allowProposedApi: true,
                cursorStyle: 'underline',
                cursorBlink: true,
                windowsMode: true,
                convertEol: true,
            })
            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.loadAddon(new WebLinksAddon());

            term.attachCustomKeyEventHandler(event => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
                inputRef.current = '';
                props.onClear?.();
                return false;
              }
              return true;
            });

            term.onData(data => {
              if (data === '\t') {
                const completedInput = props.onTabComplete?.(inputRef.current);
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
                props.onSubmit?.(input);
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
                props.onInterrupt?.();
                return;
              }

              if (!data.startsWith('\u001b')) {
                inputRef.current += data;
                term.write(data);
              }
              });
            term.open(document.getElementById('terminal'));
            term.loadAddon(new WebglAddon());

            term.write(`Loading ${colors.bold.yellow("Pygrounds v2.0")} ... \r\n`)
            fitAddon.fit();

            props.onLoad(term);
        }
        initTerminal();
    }, []);

    return <div id="terminal" style={{width: '100%', height: '100%'}} />
}

export default XTerm