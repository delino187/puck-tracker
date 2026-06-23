import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { UIProvider } from './context/UIContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PlayerProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </PlayerProvider>
  </React.StrictMode>,
)
