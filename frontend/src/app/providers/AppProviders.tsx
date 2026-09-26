import { MantineProvider } from '@mantine/core'
import { MotionConfig } from 'motion/react'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { GatewayProvider } from './GatewayProvider'
import { theme } from '../theme'
import { AuthProvider } from '../auth/AuthProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return <MantineProvider theme={theme} defaultColorScheme="light">
    <MotionConfig reducedMotion="user">
      <BrowserRouter><AuthProvider><GatewayProvider>{children}</GatewayProvider></AuthProvider></BrowserRouter>
    </MotionConfig>
  </MantineProvider>
}
