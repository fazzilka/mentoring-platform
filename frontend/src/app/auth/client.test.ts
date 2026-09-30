import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createAuthClient } from './client'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const user = {
  id: '11111111-1111-4111-8111-111111111111', name: 'Анна Смирнова', email: 'anna@example.com',
  roles: ['student'], first_name: 'Анна', last_name: 'Смирнова', timezone: 'Europe/Moscow', avatar_url: null, telegram_username: null, phone_number: null,
}
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

test('restore treats missing refresh as anonymous, not a fake stored user', async () => {
  globalThis.fetch = async () => response({ detail: 'Refresh cookie отсутствует' }, 401)
  const client = createAuthClient()
  await client.restore()
  assert.equal(client.getSnapshot().status, 'anonymous')
  assert.equal(client.getSnapshot().user, null)
})

test('restore exposes network errors and can be retried', async () => {
  globalThis.fetch = async () => { throw new TypeError('offline') }
  const client = createAuthClient()
  await client.restore()
  assert.equal(client.getSnapshot().status, 'error')
  globalThis.fetch = async path => response(String(path).endsWith('/me') ? user : { access_token: 'memory-only', expires_in: 900 })
  await client.restore()
  assert.equal(client.getSnapshot().status, 'authenticated')
})

test('concurrent refresh shares one rotation and authenticated requests retry a 401', async () => {
  let rotations = 0
  let protectedCalls = 0
  globalThis.fetch = async (path, init) => {
    assert.equal(init?.credentials, 'include')
    if (String(path).endsWith('/refresh')) { rotations++; return response({ access_token: `access-${rotations}`, expires_in: 900 }) }
    if (String(path).endsWith('/me')) return response(user)
    protectedCalls++
    return protectedCalls === 1 ? response({ detail: 'Token expired' }, 401) : response({ ok: true })
  }
  const client = createAuthClient()
  await Promise.all([client.refresh(), client.refresh(), client.refresh()])
  assert.equal(rotations, 1)
  assert.deepEqual(await client.authorizedRequest('/protected'), { ok: true })
  assert.equal(rotations, 2)
  assert.equal(protectedCalls, 2)
  assert.ok(!JSON.stringify(client.getSnapshot()).includes('access-'))
})

test('logout clears memory only after server revokes the session', async () => {
  globalThis.fetch = async path => String(path).endsWith('/logout') ? new Response(null, { status: 204 })
    : response(String(path).endsWith('/me') ? user : { access_token: 'memory-only', expires_in: 900 })
  const client = createAuthClient()
  await client.login({ email: 'anna@example.com', password: 'test-password-123' })
  assert.equal(client.getSnapshot().status, 'authenticated')
  await client.logout()
  assert.equal(client.getSnapshot().status, 'anonymous')
  assert.equal(client.expiresAt(), 0)
})
