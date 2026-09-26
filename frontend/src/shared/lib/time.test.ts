import assert from 'node:assert/strict'
import test from 'node:test'
import { zonedInstant } from './time'

test('availability time uses the account timezone, not the browser timezone', () => {
  assert.equal(zonedInstant('2030-01-10', '18:30', 'Europe/Moscow'), '2030-01-10T15:30:00.000Z')
  assert.equal(zonedInstant('2030-01-10', '18:30', 'Asia/Novosibirsk'), '2030-01-10T11:30:00.000Z')
})

test('nonexistent daylight-saving time is rejected', () => {
  assert.throws(() => zonedInstant('2030-03-10', '02:30', 'America/New_York'))
})
