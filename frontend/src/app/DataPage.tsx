import { Alert, Button, Stack } from '@mantine/core'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUserGateway } from '../entities/user/model'
import type { AppMode } from '../entities'
import { EmptyContent } from '../shared/ui/EmptyContent'
import { LoadingSkeleton } from '../shared/ui/LoadingSkeleton'
import { useDataLoader } from './providers/GatewayProvider'

export function DataPage({ children, mode: requiredMode }: { children: ReactNode; mode?: AppMode }) {
  const { mode, roles } = useUserGateway()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const view = params.get('demoView') ?? 'success'
  const load = useDataLoader()
  const [attempt, setAttempt] = useState(0)
  const key = `${location.pathname}:${view}:${attempt}`
  const [resource, setResource] = useState({ key: '', status: 'loading', error: '' })

  useEffect(() => {
    let active = true
    load(view).then(() => {
      if (active) setResource({ key, status: 'success', error: '' })
    }).catch((cause: unknown) => {
      if (active) setResource({ key, status: 'error', error: cause instanceof Error ? cause.message : 'Не удалось загрузить данные' })
    })
    return () => { active = false }
  }, [load, key, view])

  const retry = () => {
    const next = new URLSearchParams(params)
    next.delete('demoView')
    setParams(next, { replace: true })
    setAttempt(current => current + 1)
  }

  if (requiredMode && !roles.includes(requiredMode)) return <Navigate to={`/${mode}/dashboard`} replace />
  if ((requiredMode && mode !== requiredMode) || resource.key !== key || view === 'loading') return <LoadingSkeleton />
  if (resource.status === 'error') return <Stack role="alert"><Alert color="red" title="Не удалось загрузить страницу">{resource.error}</Alert><Button w="fit-content" onClick={retry}>Попробовать снова</Button></Stack>
  if (view === 'empty') return <EmptyContent title="Пока нет данных" description="Демонстрация пустого состояния. Сохранённые данные не удалены." action={{ label: 'Показать демо-данные', onClick: retry }} />
  return children
}
