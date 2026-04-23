import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import App from './App'
import './index.css'

const theme = {
  token: {
    colorPrimary: '#ff7f16',
    colorInfo: '#615ced',
    borderRadius: 12,
    colorBgLayout: '#f9f8f4',
    colorBgContainer: '#ffffff',
    colorTextBase: '#1a1716',
    colorTextSecondary: 'rgba(26, 23, 22, 0.6)',
    colorBorder: 'rgba(26, 23, 22, 0.08)',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} componentSize="middle">
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
)
