import { profileSchema } from '../../../features/edit-profile/schema'
import { availabilitySchema } from '../../../features/manage-availability/schema'
import { reflectionSchema } from '../../../features/write-reflection/schema'
import { meetingRequestSchema } from '../../../features/request-meeting/schema'
import { createDemoState, dateLabel, demoUserId, makeSlot } from './data'
import { demoStateSchema } from './storage'
import { appModes } from '../../../entities/user/types'
import type { AvailabilityInput } from '../../../entities/availability/types'
import type { PlatformData as DemoState, PlatformSnapshot, PlatformGateway } from '../../../entities/gateway'
import type { AppMode, AppNotification, MeetingAudience, MeetingStatus, Mentor, ProfileDraft, StudentScenario, TimeSlot } from '../../../entities'
const demoRoles: AppMode[] = [...appModes]

function loadState(storageKey: string): DemoState {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    const result = demoStateSchema.safeParse(value)
    if (result.success) return result.data
  } catch {
    // Invalid or unavailable local storage falls back to the initial demo.
  }
  return createDemoState()
}

function notification(title: string, description: string, kind: AppNotification['kind']): AppNotification {
  return { id: crypto.randomUUID(), title, description, kind, read: false, time: 'Только что' }
}

export function createDemoGateway(owner = 'lab-demo'): PlatformGateway {
  const storageKey = `mentoring-domain-demo:${owner}`
  let state = loadState(storageKey)
  let notice: string | null = null
  let noticeIsError = false
  const listeners = new Set<() => void>()
  let snapshot: PlatformSnapshot
  const publish = () => { snapshot = buildSnapshot(); listeners.forEach(listener => listener()) }
  const setNotice = (message: string | null, isError = false) => { notice = message; noticeIsError = isError; publish() }
  const setState = (update: (current: DemoState) => DemoState) => {
    state = update(state)
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch {
      notice = 'Браузер не разрешил сохранение. Изменения останутся только до перезагрузки.'; noticeIsError = true
    }
    publish()
  }
  function buildSnapshot(): PlatformSnapshot {
  const assignment = state.assignments.find((item) => item.status === 'active') ?? null
  const scenario: StudentScenario = assignment ? 'active'
    : state.assignments.at(-1)?.endReason === 'mentor_departed' ? 'departed' : 'none'
  const currentMentor = state.mentors.find((mentor) => mentor.id === assignment?.mentorId) ?? null
  const claimedSlotIds = state.meetings.filter((meeting) => ['pending', 'confirmed'].includes(meeting.status))
    .flatMap((meeting) => meeting.slotId ? [meeting.slotId] : [])
  const user = {
    id: demoUserId, name: `${state.profile.firstName} ${state.profile.lastName}`.trim(),
    email: state.profile.email, roles: demoRoles,
  }
  const fail = (message: string) => { setNotice(message, true); return false }

  const setScenario = (next: StudentScenario) => {
    setState((current) => {
      const active = current.assignments.find((item) => item.status === 'active')
      const ended = current.assignments.filter((item) => item.status === 'ended')
      if (next === 'active') return {
        ...current, assignments: [...ended, active ?? {
          id: crypto.randomUUID(), mentorId: current.mentors[0].id, status: 'active',
          startDate: dateLabel(new Date().toISOString()),
        }],
      }
      const assignments = [...ended, {
        id: active?.id ?? crypto.randomUUID(), mentorId: active?.mentorId ?? current.mentors[0].id,
        status: 'ended' as const, startDate: active?.startDate ?? 'Начало демонстрации',
        endDate: dateLabel(new Date().toISOString()),
        endReason: next === 'departed' ? 'mentor_departed' as const : undefined,
      }]
      return {
        ...current, assignments,
        meetings: current.meetings.map((meeting) => meeting.studentId === demoUserId
          && ['pending', 'confirmed'].includes(meeting.status) ? { ...meeting, status: 'cancelled' } : meeting),
      }
    })
    setNotice('Демонстрационный сценарий изменён')
  }

  const selectMentor = async (mentor: Mentor) => {
    if (state.assignments.some(item => item.status === 'active')) return fail('У вас уже есть активный наставник')
    if (!mentor.acceptingStudents || mentor.status !== 'online') return fail('Наставник пока не принимает учеников')
    setState((current) => ({
      ...current,
      assignments: [...current.assignments, { id: crypto.randomUUID(), mentorId: mentor.id, status: 'active', startDate: dateLabel(new Date().toISOString()) }],
      notifications: [notification('Наставник выбран', `${mentor.name} теперь ваш ментор.`, 'meeting'), ...current.notifications],
    }))
    setNotice('Наставник выбран')
    return true
  }

  const requestMeeting = async (mentor: Mentor, slot: TimeSlot) => {
    const validation = meetingRequestSchema.safeParse({ mentorId: mentor.id, slotId: slot.id, startsAt: slot.startsAt, duration: slot.duration })
    if (!validation.success) return fail(validation.error.issues[0].message)
    const activeAssignment = state.assignments.find(item => item.status === 'active')
    if (activeAssignment?.mentorId !== mentor.id) return fail('Встречи доступны только с вашим наставником')
    if (!mentor.availableSlots.some((item) => item.id === slot.id) || state.meetings.some(item => item.slotId === slot.id && ['pending', 'confirmed'].includes(item.status))) return fail('Слот уже занят')
    const starts = new Date(slot.startsAt)
    if (starts <= new Date()) return fail('Это свободное время уже прошло')
    const weekStart = new Date(starts)
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const count = state.meetings.filter((meeting) => meeting.studentId === demoUserId
      && meeting.mentorId === mentor.id && meeting.status !== 'cancelled'
      && new Date(meeting.startsAt) >= weekStart && new Date(meeting.startsAt) < weekEnd).length
    if (count >= 2) return fail('Не более двух встреч с наставником в неделю')
    setState((current) => ({
      ...current,
      meetings: [{
        id: crypto.randomUUID(), startsAt: slot.startsAt, title: 'Встреча с наставником',
        mentorId: mentor.id, studentId: demoUserId, mentorName: mentor.name, studentName: user.name,
        date: slot.date, time: slot.time, duration: slot.duration, status: 'pending', slotId: slot.id,
      }, ...current.meetings],
      notifications: [notification('Заявка отправлена', `${slot.date}, ${slot.time} · ожидает подтверждения.`, 'meeting'), ...current.notifications],
    }))
    setNotice('Заявка на встречу отправлена')
    return true
  }

  const changeMeeting = async (id: string, status: MeetingStatus, audience: MeetingAudience) => {
    const meeting = state.meetings.find((item) => item.id === id)
    if (!meeting || (audience === 'student' ? meeting.studentId : meeting.mentorId) !== demoUserId) return fail('Встреча недоступна')
    if (status === 'confirmed' && meeting.status !== 'pending') return fail('Заявка уже обработана')
    if (status === 'completed' && meeting.status !== 'confirmed') return fail('Встреча ещё не подтверждена')
    if (status === 'cancelled' && !['pending', 'confirmed'].includes(meeting.status)) return fail('Встречу уже нельзя отменить')
    setState((current) => ({
      ...current,
      meetings: current.meetings.map((item) => item.id === id ? {
        ...item, status, meetingUrl: status === 'confirmed' ? current.profile.telemostUrl || 'https://telemost.yandex.ru/' : item.meetingUrl,
      } : item),
      availability: current.availability.map((slot) => slot.id === meeting.slotId ? {
        ...slot, state: status === 'cancelled' ? 'free' : status === 'confirmed' ? 'booked' : slot.state,
      } : slot),
      notifications: [notification(status === 'confirmed' ? 'Встреча подтверждена' : status === 'completed' ? 'Встреча завершена' : 'Встреча отменена', `${meeting.title} · ${meeting.date}, ${meeting.time}.`, 'meeting'), ...current.notifications],
    }))
    setNotice(status === 'confirmed' ? 'Встреча подтверждена' : status === 'completed' ? 'Встреча завершена' : 'Встреча отменена')
    return true
  }

  const addAvailability = async (input: AvailabilityInput) => {
    const validation = availabilitySchema.safeParse(input)
    if (!validation.success) return fail(validation.error.issues[0].message)
    const starts = new Date(`${input.date}T${input.time}`)
    if (!Number.isFinite(starts.getTime()) || starts <= new Date()) return fail('Укажите будущие дату и время')
    if (state.availability.some((slot) => new Date(slot.startsAt).getTime() < starts.getTime() + input.duration * 60_000
      && new Date(slot.startsAt).getTime() + slot.duration * 60_000 > starts.getTime())) return fail('Время пересекается с другим слотом')
    setState((current) => ({
      ...current, availability: [...current.availability, { ...makeSlot(crypto.randomUUID(), starts.toISOString(), input.duration), state: 'free' as const }]
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }))
    setNotice('Свободное время добавлено')
    return true
  }

  const removeAvailability = async (id: string) => {
    if (state.availability.find((slot) => slot.id === id)?.state !== 'free') return fail('Занятый слот удалить нельзя')
    setState((current) => ({ ...current, availability: current.availability.filter((slot) => slot.id !== id) }))
    setNotice('Свободное время удалено')
    return true
  }

  const saveReflection = async (meetingId: string, author: MeetingAudience, summary: string, nextStep?: string) => {
    const meeting = state.meetings.find((item) => item.id === meetingId)
    const validation = reflectionSchema.safeParse({ summary, nextStep })
    if (!validation.success) return fail(validation.error.issues[0].message)
    if (!meeting || meeting.status !== 'completed' || (author === 'student' ? meeting.studentId : meeting.mentorId) !== demoUserId) return fail('Заметки доступны после вашей завершённой встречи')
    setState((current) => {
      const existing = current.reflections.find((item) => item.meetingId === meetingId && item.author === author)
      const reflection = { id: existing?.id ?? crypto.randomUUID(), meetingId, author, date: dateLabel(new Date().toISOString()), summary: summary.trim(), nextStep: nextStep?.trim() }
      return { ...current, reflections: existing ? current.reflections.map((item) => item.id === existing.id ? reflection : item) : [...current.reflections, reflection] }
    })
    setNotice('Приватная заметка сохранена')
    return true
  }

  const saveProfile = async (profile: ProfileDraft) => {
    const validation = profileSchema.safeParse(profile)
    if (!validation.success) return fail(validation.error.issues[0].message)
    setState((current) => ({ ...current, profile, meetings: current.meetings.map((meeting) => ({
      ...meeting, studentName: meeting.studentId === demoUserId ? `${profile.firstName} ${profile.lastName}`.trim() : meeting.studentName,
      mentorName: meeting.mentorId === demoUserId ? `${profile.firstName} ${profile.lastName}`.trim() : meeting.mentorName,
    })) }))
    setNotice('Профиль сохранён')
    return true
  }

  const value = {
    ...state, user, roles: demoRoles, scenario, assignment, currentMentor, claimedSlotIds,
    notice, noticeIsError, unreadCount: state.notifications.filter((item) => !item.read).length,
    setScenario,
    setMode: (mode: AppMode) => setState((current) => current.mode === mode ? current : { ...current, mode }),
    selectMentor, requestMeeting, addAvailability, removeAvailability, saveReflection, saveProfile,
    cancelMeeting: (id: string) => changeMeeting(id, 'cancelled', 'student'),
    updateMeetingStatus: (id: string, status: MeetingStatus) => changeMeeting(id, status, 'mentor'),
    markAllNotificationsRead: async () => {
      setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }))
      setNotice('Уведомления прочитаны')
      return true
    },
    dismissNotice: () => setNotice(null),
  }
  return value
  }
  snapshot = buildSnapshot()
  return { getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    load: async view => { if (view === 'error') throw new Error('Демонстрация ошибки загрузки. Попробуйте снова.'); }
  }
}
