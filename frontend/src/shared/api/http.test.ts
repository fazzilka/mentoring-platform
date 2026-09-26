import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { HttpError, httpRequest } from './http'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })

for (const status of [401, 403, 404, 409, 422, 500]) test(`HTTP ${status} is exposed without losing its status`, async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: status === 422 ? [{ msg: 'Укажите имя' }] : 'Ошибка запроса' }), { status })
  await assert.rejects(httpRequest('/resource'), error => error instanceof HttpError && error.status === status && Boolean(error.message))
})

test('server internals are not shown for 500', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'private server data' }), { status: 500 })
  await assert.rejects(httpRequest('/resource'), error => error instanceof Error && !error.message.includes('private'))
})
