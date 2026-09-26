import assert from 'node:assert/strict'
import test from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { createAuthClient, type AuthUser } from '../../auth/client'
import { createApiGateway } from './gateway'

test('a successful mutation reloads active platform data only once', async () => {
  const user: AuthUser = {
    id: '11111111-1111-4111-8111-111111111111', name: 'Анна Смирнова', email: 'anna@example.com',
    roles: ['student'], first_name: 'Анна', last_name: 'Смирнова', timezone: 'Europe/Moscow', avatar_url: null,
  }
  let loads = 0
  const auth = {
    ...createAuthClient(),
    authorizedRequest: async (path: string): Promise<unknown> => {
      if (path === '/profiles/student/me') {
        loads += 1
        return { user_id: user.id, about: '', level: '', direction: '', goal: '', technologies: [], learning_interests: '' }
      }
      return []
    },
  }
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })
  const gateway = createApiGateway(client, auth, user)
  const unsubscribe = gateway.subscribe(() => undefined)
  try {
    await gateway.load()
    assert.equal(loads, 1)
    assert.equal(await gateway.getSnapshot().markAllNotificationsRead(), true)
    assert.equal(loads, 2)
  } finally {
    unsubscribe()
    client.clear()
  }
})
