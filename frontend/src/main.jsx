import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { ChatbotProvider } from './context/ChatbotContext'
import { initPerformanceMode } from './utils/devicePerformance'
import './index.css'

initPerformanceMode()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ChatbotProvider>
            <App />
          </ChatbotProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
