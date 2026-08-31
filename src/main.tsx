import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext'
import { initAccent } from './lib/accent'
import { initTheme } from './lib/theme'
import { initCursor } from './lib/cursor'
import './index.css'

initAccent()
initTheme()
initCursor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
