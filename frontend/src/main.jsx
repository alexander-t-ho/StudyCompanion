import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Suppress browser extension errors that are harmless
window.addEventListener('error', (event) => {
  // Suppress the "message channel closed" error from browser extensions
  if (event.message && event.message.includes('message channel closed')) {
    event.preventDefault()
    return false
  }
})

// Suppress unhandled promise rejections from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  // Suppress the "message channel closed" error from browser extensions
  if (event.reason && typeof event.reason === 'object' && event.reason.message) {
    if (event.reason.message.includes('message channel closed') || 
        event.reason.message.includes('asynchronous response')) {
      event.preventDefault()
      return false
    }
  }
  if (event.reason && typeof event.reason === 'string') {
    if (event.reason.includes('message channel closed') || 
        event.reason.includes('asynchronous response')) {
      event.preventDefault()
      return false
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <App />
    </BrowserRouter>
  </React.StrictMode>,
)

