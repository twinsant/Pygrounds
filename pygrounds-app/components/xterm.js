// components/terminal-component
import { useRef, useContext, useEffect } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import colors from 'ansi-colors';

function XTerm(props) {
    var term = useRef(null);

    useEffect(() => {
        async function initTerminal() {
            console.log(colors.yellow("XTerm loaded"))
            term = new Terminal({
                cursorStyle: 'underline',
                cursorBlink: true,
                windowsMode: true,
            })
            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.onData(data => {
                let dataWrapper = data;
                if (dataWrapper === '\r') {
                  dataWrapper = '\n';
                } else if (dataWrapper === '\u0003') {
                  dataWrapper += '\n';
                }
                console.log(data);
              });
            term.open(document.getElementById('terminal'));
            term.write(`Loading ${colors.bold.yellow("Pygrounds v0.1")} ... \r\n`)
            fitAddon.fit();

            props.onLoad(term);
        }
        initTerminal();
    }, []);

    return <div id="terminal" />
}

export default XTerm