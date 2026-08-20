import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DesktopPlayground from './DesktopPlayground'
import './styles.css'

function App() {
  return <DesktopPlayground />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
