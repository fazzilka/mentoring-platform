import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Button, Stack, Text } from '@mantine/core'
import { z } from 'zod'
import { useAuth } from '../../app/auth/AuthProvider'

export function TelegramConnection() {
  const auth = useAuth()
  const status = useQuery({ queryKey: ['telegram', auth.user?.id], queryFn: async () =>
    z.object({ connected: z.boolean() }).parse(await auth.authorizedRequest('/telegram/status')), refetchInterval: 10_000 })
  const link = useMutation({ mutationFn: async () =>
    z.object({ url: z.url() }).parse(await auth.authorizedRequest('/telegram/link', { method: 'POST' })) })
  return <Stack gap="sm">
    <Text size="sm" c="dimmed">{status.data?.connected ? 'Telegram подключён. Напоминания придут в личный чат с ботом.' : 'Email-напоминания работают независимо от Telegram. Для подключения откройте бота по одноразовой ссылке.'}</Text>
    {(status.error || link.error) && <Alert color="red">{(status.error ?? link.error)?.message}</Alert>}
    {link.data ? <Button component="a" href={link.data.url} target="_blank" rel="noreferrer" w="fit-content">Открыть Telegram</Button>
      : <Button variant="light" loading={link.isPending || status.isLoading} w="fit-content" onClick={() => link.mutate()}>{status.data?.connected ? 'Переподключить Telegram' : 'Подключить Telegram'}</Button>}
  </Stack>
}
