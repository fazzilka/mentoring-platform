
import '@mantine/core/styles.css'
import './app/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/router'
import { AppProviders } from './app/providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders><App /></AppProviders>
  </StrictMode>,
)
