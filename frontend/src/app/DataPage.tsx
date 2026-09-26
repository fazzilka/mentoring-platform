import { Alert, Button, Stack } from '@mantine/core'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useUserGateway } from '../entities/user/model'
import type { AppMode } from '../entities'
import { LoadingSkeleton } from '../shared/ui/LoadingSkeleton'
import { useDataLoader } from './providers/GatewayProvider'

export function DataPage({ children, mode: requiredMode }: { children: ReactNode; mode?: AppMode }) {
  const { mode, roles } = useUserGateway()
  const location = useLocation()
  const load = useDataLoader()
  const [attempt, setAttempt] = useState(0)
  const key = `${location.pathname}:${attempt}`
  const [resource, setResource] = useState({ key: '', status: 'loading', error: '' })

  useEffect(() => {
    let active = true
    load().then(() => {
      if (active) setResource({ key, status: 'success', error: '' })
    }).catch((cause: unknown) => {
      if (active) setResource({ key, status: 'error', error: cause instanceof Error ? cause.message : 'Не удалось загрузить данные' })
    })
    return () => { active = false }
  }, [load, key])

  const retry = () => {
    setAttempt(current => current + 1)
  }

  if (requiredMode && !roles.includes(requiredMode)) return <Navigate to={`/${mode}/dashboard`} replace />
  if ((requiredMode && mode !== requiredMode) || resource.key !== key) return <LoadingSkeleton />
  if (resource.status === 'error') return <Stack role="alert"><Alert color="red" title="Не удалось загрузить страницу">{resource.error}</Alert><Button w="fit-content" onClick={retry}>Попробовать снова</Button></Stack>
  return children
}
