import { MantineProvider } from '@mantine/core'
import { MotionConfig } from 'motion/react'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { GatewayProvider } from './GatewayProvider'
import { theme } from '../theme'

export function AppProviders({ children }: { children: ReactNode }) {
  return <MantineProvider theme={theme} defaultColorScheme="light">
    <MotionConfig reducedMotion="user">
      <BrowserRouter><GatewayProvider>{children}</GatewayProvider></BrowserRouter>
    </MotionConfig>
  </MantineProvider>
}
