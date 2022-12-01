// components/terminal-component
import { useRef, useState, useEffect } from 'react'
import { Terminal } from 'xterm'

function XTerm() {
    useEffect(() => {
        async function initTerminal() {
            const term = new Terminal()
            term.open(document.getElementById('terminal'));
            term.write('Loading \x1B[33;1mPygrounds v0.1\x1B[0m ... \r\n')
        }
        initTerminal();
    }, []);

    return <div id="terminal" />
}

export default XTerm