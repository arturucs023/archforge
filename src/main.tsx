import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext'
import { applyAccent, initAccent } from './lib/accent'
import { initTheme } from './lib/theme'
import { initCursor, loadCursorConfig } from './lib/cursor'
import './index.css'

const accentId = initAccent()
initCursor()
applyAccent(accentId, loadCursorConfig())
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
