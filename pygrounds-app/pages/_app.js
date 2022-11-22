import { useState, useEffect } from 'react'
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  const [count, setCount] = useState(0);

  function scriptLoaded() {
    console.log('Ready.')
    // https://pyodide.org/en/stable/usage/quickstart.html
  }

  useEffect(() => {
    // Init here
    console.log('Init..')

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js";
    script.async = true;
    script.onload = () => scriptLoaded();

    document.body.appendChild(script);
  }, [count]);

  return <Component {...pageProps} />
}

export default MyApp
