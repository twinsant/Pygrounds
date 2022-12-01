// components/terminal-component
import { useRef, useState, useEffect } from 'react'
import { Terminal } from 'xterm'
import colors from 'ansi-colors'

function XTerm() {
    useEffect(() => {
        async function initTerminal() {
            console.log(colors.red("XTerm loaded"))
            const term = new Terminal()
            term.open(document.getElementById('terminal'));
            term.write(`Loading ${colors.red("Pygrounds v0.1")} ... \r\n`)
        }
        initTerminal();
    }, []);

    return <div id="terminal" />
}

export default XTerm