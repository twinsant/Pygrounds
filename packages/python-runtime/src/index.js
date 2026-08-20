export class PyodideRuntime {
  constructor({ indexURL, fallbackURL, stdout, stderr, stdin }) {
    this.indexURL = indexURL;
    this.fallbackURL = fallbackURL;
    this.stdout = stdout;
    this.stderr = stderr;
    this.stdin = stdin;
    this.pyodide = null;
  }

  async load() {
    if (typeof globalThis.loadPyodide !== 'function') {
      if (!this.fallbackURL || typeof document === 'undefined') {
        throw new Error('Pyodide is not loaded');
      }

      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${this.fallbackURL}pyodide.js`;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Pyodide runtime'));
        document.head.appendChild(script);
      });

      this.indexURL = this.fallbackURL;
    }

    try {
      this.pyodide = await globalThis.loadPyodide({
        indexURL: this.indexURL,
        stdout: this.stdout,
        stderr: this.stderr,
        stdin: this.stdin,
      });
    } catch (error) {
      if (!this.fallbackURL || this.indexURL === this.fallbackURL) throw error;

      this.indexURL = this.fallbackURL;
      this.pyodide = await globalThis.loadPyodide({
        indexURL: this.indexURL,
        stdout: this.stdout,
        stderr: this.stderr,
        stdin: this.stdin,
      });
    }

    return this;
  }

  get ready() {
    return this.pyodide !== null;
  }

  runPython(code) {
    return this.pyodide.runPython(code);
  }

  runPythonAsync(code) {
    return this.pyodide.runPythonAsync(code);
  }

  loadPackagesFromImports(code) {
    return this.pyodide.loadPackagesFromImports(code);
  }
}
