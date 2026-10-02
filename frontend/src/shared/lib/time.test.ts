import assert from 'node:assert/strict'
import test from 'node:test'
import { zonedInstant } from './time'
import { createAvailabilitySchema } from '../../features/manage-availability/schema'
import { profileSchema } from '../../features/edit-profile/schema'

test('availability time uses the account timezone, not the browser timezone', () => {
  assert.equal(zonedInstant('2030-01-10', '18:30', 'Europe/Moscow'), '2030-01-10T15:30:00.000Z')
  assert.equal(zonedInstant('2030-01-10', '18:30', 'Asia/Novosibirsk'), '2030-01-10T11:30:00.000Z')
})

test('nonexistent daylight-saving time is rejected', () => {
  assert.throws(() => zonedInstant('2030-03-10', '02:30', 'America/New_York'))
})

test('availability validation compares future times in the profile timezone', (context) => {
  context.mock.method(Date, 'now', () => Date.parse('2030-01-10T15:00:00Z'))
  const input = { date: '2030-01-10', time: '18:30', duration: 60 }
  assert.equal(createAvailabilitySchema('Europe/Moscow').safeParse(input).success, true)
  assert.equal(createAvailabilitySchema('Asia/Novosibirsk').safeParse(input).success, false)
  assert.equal(createAvailabilitySchema('America/New_York').safeParse({ ...input, date: '2030-03-10', time: '02:30' }).success, false)
})

test('profile field limits match the backend contract', () => {
  for (const name of ['studentLevel', 'studentDirection'] as const) {
    assert.equal(profileSchema.shape[name].safeParse('a'.repeat(101)).success, false)
  }
  for (const name of ['mentorCompany', 'mentorPosition'] as const) {
    assert.equal(profileSchema.shape[name].safeParse('a'.repeat(161)).success, false)
  }
  for (const name of ['studentTechnologies', 'mentorSkills'] as const) {
    assert.equal(profileSchema.shape[name].safeParse(Array(51).fill('Python').join(',')).success, false)
  }
})
