import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loginSchema, registrationSchema } from '../../features/auth-form/schema'
import { profileSchema } from '../../features/edit-profile/schema'
import { availabilitySchema } from '../../features/manage-availability/schema'
import { meetingRequestSchema } from '../../features/request-meeting/schema'
import { reflectionSchema } from '../../features/write-reflection/schema'
import { mentorMeetingSchema } from '../../features/manage-meeting-request/schema'

test('auth forms reject invalid credentials and blank names', () => {
  assert.equal(loginSchema.safeParse({ email: 'bad', password: '123' }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'oleg@example.ru', password: 'demo-password' }).success, true)
  assert.equal(registrationSchema.safeParse({ email: 'oleg@example.ru', password: 'demo-password', name: ' ', initial_role: 'student' }).success, false)
})

test('profile validation checks names, timezone, contacts and meeting URL', () => {
  const profile = {
    avatarUrl: '', firstName: 'Олег', lastName: 'Митин', email: 'oleg@example.ru', telegramUsername: '@oleg_mitin', phoneNumber: '+79991234567', timezone: 'Europe/Moscow',
    studentAbout: '', studentLevel: '', studentDirection: '', studentGoal: '', studentTechnologies: '', studentLearning: '',
    mentorAbout: '', mentorSpecialization: 'Backend', mentorSkills: '', mentorExperience: '', mentorCompany: '', mentorPosition: '', meetingUrl: 'https://meet.google.com/abc-defg-hij',
  }
  assert.equal(profileSchema.safeParse(profile).success, true)
  for (const change of [{ firstName: ' ' }, { timezone: 'Not/AZone' }, { meetingUrl: 'javascript:alert(1)' }, { telegramUsername: '@bad' }, { phoneNumber: '89991234567' }]) {
    assert.equal(profileSchema.safeParse({ ...profile, ...change }).success, false)
  }
})

test('availability rejects invalid dates, times and duration', () => {
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

test('mentor meeting requires a student, a slot and a safe HTTPS link', () => {
  const input = { studentId: 'student-id', slotId: 'slot-id', meetingUrl: 'https://zoom.us/j/123456789' }
  assert.equal(mentorMeetingSchema.safeParse(input).success, true)
  assert.equal(mentorMeetingSchema.safeParse({ ...input, meetingUrl: 'javascript:alert(1)' }).success, false)
  assert.equal(mentorMeetingSchema.safeParse({ ...input, studentId: '' }).success, false)
})

test('reflection trims text and rejects empty or oversized notes', () => {
  assert.equal(reflectionSchema.parse({ summary: '  Разобрали транзакции  ' }).summary, 'Разобрали транзакции')
  assert.equal(reflectionSchema.safeParse({ summary: '   ' }).success, false)
  assert.equal(reflectionSchema.safeParse({ summary: 'a'.repeat(5001) }).success, false)
})
