import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

console.log('--- FRONTEND BOOT STARTING ---');

import GlobalErrorBoundary from '@/components/GlobalErrorBoundary.jsx'
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </React.StrictMode>
  )
} catch (e) {
  console.error("CRITICAL BOOT ERROR:", e);
  document.getElementById('root').innerHTML = '<div style="color:red; padding:20px;"><h1>Critical Boot Error</h1><pre>' + e.toString() + '</pre></div>';
}
