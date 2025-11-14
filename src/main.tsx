import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App.tsx'

// antd React 19 호환성 경고 억제
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const warning = args[0];
  if (
    typeof warning === 'string' &&
    (warning.includes('antd v5 support React is 16 ~ 18') ||
     warning.includes('[antd: compatible]'))
  ) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
