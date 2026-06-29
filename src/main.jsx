import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { UIProvider } from './context/UIContext.jsx'
import { GlobalErrorBoundary } from './components/shared/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // GlobalErrorBoundary sits outside StrictMode and all providers so it can
  // catch crashes in the providers themselves as well as in the app tree.
  <GlobalErrorBoundary>
    <React.StrictMode>
      <PlayerProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </PlayerProvider>
    </React.StrictMode>
  </GlobalErrorBoundary>,
)
