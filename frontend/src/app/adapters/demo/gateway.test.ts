import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { loginSchema, registrationSchema } from '../../../features/auth-form/schema'
import { profileSchema } from '../../../features/edit-profile/schema'
import { availabilitySchema } from '../../../features/manage-availability/schema'
import { meetingRequestSchema } from '../../../features/request-meeting/schema'
import { reflectionSchema } from '../../../features/write-reflection/schema'
import { createDemoGateway } from './gateway'
import { createDemoState } from './data'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
beforeEach(() => localStorage.clear())

test('auth schemas reject invalid email, short password and blank name', () => {
  assert.equal(loginSchema.safeParse({ email: 'bad', password: '123' }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'oleg@example.ru', password: 'demo-password' }).success, true)
  assert.equal(registrationSchema.safeParse({ email: 'oleg@example.ru', password: 'demo-password', name: ' ', initial_role: 'student' }).success, false)
})

test('profile validation checks names, timezone and Telemost hostname', () => {
  const { profile } = createDemoState()
  assert.equal(profileSchema.safeParse(profile).success, true)
  for (const change of [{ firstName: ' ' }, { timezone: 'Not/AZone' }, { telemostUrl: 'https://telemost.yandex.ru.evil.example/' }]) {
    assert.equal(profileSchema.safeParse({ ...profile, ...change }).success, false)
  }
})

test('availability rejects invalid calendar date, past time and duration', () => {
  for (const input of [
    { date: '2030-02-30', time: '19:00', duration: 60 },
    { date: '2020-01-01', time: '19:00', duration: 75 },
    { date: '2030-01-01', time: '25:00', duration: 90 },
    { date: '2030-01-01', time: '19:00', duration: 30 },
  ]) assert.equal(availabilitySchema.safeParse(input).success, false)
})

test('meeting request validates slot, future timestamp and duration', () => {
  const input = { mentorId: 'mentor', slotId: 'slot', startsAt: new Date(Date.now() + 86400000).toISOString(), duration: 60 }
  assert.equal(meetingRequestSchema.safeParse(input).success, true)
  assert.equal(meetingRequestSchema.safeParse({ ...input, slotId: '' }).success, false)
  assert.equal(meetingRequestSchema.safeParse({ ...input, startsAt: '2020-01-01T12:00:00Z' }).success, false)
})

test('reflection trims text and rejects empty or oversized notes', () => {
  assert.equal(reflectionSchema.parse({ summary: '  Разобрали транзакции  ' }).summary, 'Разобрали транзакции')
  assert.equal(reflectionSchema.safeParse({ summary: '   ' }).success, false)
  assert.equal(reflectionSchema.safeParse({ summary: 'a'.repeat(5001) }).success, false)
})

test('gateway snapshots remain stable until data changes and subscriptions unsubscribe', async () => {
  const gateway = createDemoGateway()
  assert.equal(gateway.getSnapshot(), gateway.getSnapshot())
  let changes = 0
  const unsubscribe = gateway.subscribe(() => changes++)
  gateway.getSnapshot().setMode('mentor')
  assert.ok(changes > 0)
  assert.equal(gateway.getSnapshot().mode, 'mentor')
  unsubscribe()
  const count = changes
  gateway.getSnapshot().setMode('student')
  assert.equal(changes, count)
})

test('gateway permits only one active mentor and persists the assignment', async () => {
  const gateway = createDemoGateway()
  const [mentor, other] = gateway.getSnapshot().mentors
  assert.equal(await gateway.getSnapshot().selectMentor(mentor), true)
  assert.equal(await gateway.getSnapshot().selectMentor(other), false)
  assert.equal(createDemoGateway().getSnapshot().currentMentor?.id, mentor.id)
})

test('gateway rejects a duplicate booking and cancellation preserves meeting history', async () => {
  const gateway = createDemoGateway()
  const mentor = gateway.getSnapshot().mentors[0]
  await gateway.getSnapshot().selectMentor(mentor)
  const slot = mentor.availableSlots[0]
  assert.equal(await gateway.getSnapshot().requestMeeting(mentor, slot), true)
  assert.equal(await gateway.getSnapshot().requestMeeting(mentor, slot), false)
  const meeting = gateway.getSnapshot().meetings.find(item => item.slotId === slot.id)
  assert.ok(meeting)
  assert.equal(await gateway.getSnapshot().cancelMeeting(meeting.id), true)
  assert.equal(gateway.getSnapshot().meetings.find(item => item.id === meeting.id)?.status, 'cancelled')
})

test('departure preserves reflections and permits selecting a new mentor', async () => {
  const gateway = createDemoGateway()
  const notes = gateway.getSnapshot().reflections.length
  await gateway.getSnapshot().selectMentor(gateway.getSnapshot().mentors[0])
  await gateway.getSnapshot().departMentor()
  assert.equal(gateway.getSnapshot().scenario, 'departed')
  assert.equal(gateway.getSnapshot().reflections.length, notes)
  assert.equal(await gateway.getSnapshot().selectMentor(gateway.getSnapshot().mentors[1]), true)
})

test('corrupt nested persistence falls back to a valid demo state', () => {
  localStorage.setItem('mentoring-domain-demo:lab-demo', JSON.stringify({ ...createDemoState(), meetings: [{ status: 'broken' }] }))
  assert.ok(createDemoGateway().getSnapshot().meetings.length > 0)
})

test('retained command references validate the latest state, not a stale snapshot', async () => {
  const gateway = createDemoGateway()
  const { selectMentor, requestMeeting, mentors } = gateway.getSnapshot()
  assert.equal(await selectMentor(mentors[0]), true)
  assert.equal(await selectMentor(mentors[1]), false)
  const slot = mentors[0].availableSlots[0]
  assert.equal(await requestMeeting(mentors[0], slot), true)
  assert.equal(await requestMeeting(mentors[0], slot), false)
})

test('demo loading failures can be retried without deleting data', async () => {
  const gateway = createDemoGateway()
  await assert.rejects(gateway.load('error'), /ошибки загрузки/)
  await gateway.load()
  assert.equal(gateway.getSnapshot().mentors.length, 4)
})
