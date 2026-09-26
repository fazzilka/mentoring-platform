import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Alert, Button, Stack } from '@mantine/core'
import { Navigate, Outlet } from 'react-router-dom'
import { LoadingSkeleton } from '../../shared/ui/LoadingSkeleton'
import { createAuthClient } from './client'

const AuthContext = createContext<ReturnType<typeof createAuthClient> | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createAuthClient)
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot)
  useEffect(() => { void client.restore() }, [client])
  useEffect(() => {
    if (snapshot.status !== 'authenticated') return
    const timer = window.setTimeout(() => { void client.refresh().catch(() => undefined) },
      Math.max(1000, client.expiresAt() - Date.now() - 30_000))
    return () => window.clearTimeout(timer)
  }, [client, snapshot])
  return <AuthContext.Provider value={client}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const client = useContext(AuthContext)
  if (!client) throw new Error('AuthProvider отсутствует')
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot)
  return { ...snapshot, ...client }
}

export function ProtectedRoute() {
  const auth = useAuth()
  if (auth.status === 'loading') return <LoadingSkeleton />
  if (auth.status === 'error') return <Stack p="xl"><Alert color="red">{auth.error}</Alert><Button onClick={() => { void auth.restore() }}>Повторить</Button></Stack>
  if (!auth.user) return <Navigate to="/login" replace />
  return <Outlet />
}
