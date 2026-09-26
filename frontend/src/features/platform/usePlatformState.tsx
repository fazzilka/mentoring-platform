import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createDemoState, dateLabel, demoUserId, makeSlot, type DemoState } from './demoData'
import type { AppMode, AppNotification, MeetingAudience, MeetingStatus, Mentor, ProfileDraft, StudentScenario, TimeSlot } from '../../shared/types'

const storageKey = 'mentoring-lab-01-v1'
const demoRoles: AppMode[] = ['student', 'mentor']
type Credentials = { email: string; password: string }
type Registration = Credentials & { name: string; initial_role: AppMode }

function loadState(): DemoState {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as DemoState | null
    if (value && typeof value.loggedIn === 'boolean' && ['student', 'mentor'].includes(value.mode)
      && typeof value.profile?.firstName === 'string'
      && ['mentors', 'students', 'meetings', 'assignments', 'availability', 'notifications', 'reflections']
        .every((key) => Array.isArray(value[key as keyof DemoState]))) return value
  } catch {
    // Invalid or unavailable local storage falls back to the initial demo.
  }
  return createDemoState()
}

function notification(title: string, description: string, kind: AppNotification['kind']): AppNotification {
  return { id: crypto.randomUUID(), title, description, kind, read: false, time: 'Только что' }
}

function validateCredentials({ email, password }: Credentials) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Укажите корректный email')
  if (password.length < 8) throw new Error('Пароль должен содержать не менее 8 символов')
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState)
  const [notice, setNoticeValue] = useState<string | null>(null)
  const [noticeIsError, setNoticeIsError] = useState(false)
  const setNotice = useCallback((message: string | null, isError = false) => {
    setNoticeValue(message)
    setNoticeIsError(isError)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch {
      setNotice('Браузер не разрешил сохранение. Изменения останутся только до перезагрузки.', true)
    }
  }, [state, setNotice])

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
    if (assignment) return fail('У вас уже есть активный наставник')
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
    if (assignment?.mentorId !== mentor.id) return fail('Встречи доступны только с вашим наставником')
    if (!mentor.availableSlots.some((item) => item.id === slot.id) || claimedSlotIds.includes(slot.id)) return fail('Слот уже занят')
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

  const addAvailability = async (input: { date: string; time: string; duration: 60 | 75 | 90 }) => {
    const starts = new Date(`${input.date}T${input.time}`)
    if (!Number.isFinite(starts.getTime()) || starts <= new Date()) return fail('Укажите будущие дату и время')
    if (![60, 75, 90].includes(input.duration)) return fail('Выберите длительность 60, 75 или 90 минут')
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
    if (!summary.trim()) return fail('Напишите, что было важным на встрече')
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
    if (!profile.firstName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return fail('Укажите имя и корректный email')
    if (profile.avatarUrl && !/^https?:\/\//.test(profile.avatarUrl)) return fail('Аватар должен быть ссылкой http или https')
    if (profile.telemostUrl && !/^https:\/\/telemost\.yandex\.ru(?:\/|$)/.test(profile.telemostUrl)) return fail('Укажите ссылку https://telemost.yandex.ru/...')
    setState((current) => ({ ...current, profile, meetings: current.meetings.map((meeting) => ({
      ...meeting, studentName: meeting.studentId === demoUserId ? `${profile.firstName} ${profile.lastName}`.trim() : meeting.studentName,
      mentorName: meeting.mentorId === demoUserId ? `${profile.firstName} ${profile.lastName}`.trim() : meeting.mentorName,
    })) }))
    setNotice('Профиль сохранён')
    return true
  }

  const value = {
    ...state, user, roles: demoRoles, loading: false, scenario, assignment, currentMentor, claimedSlotIds,
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
    login: async (credentials: Credentials) => {
      validateCredentials(credentials)
      setState((current) => ({ ...current, loggedIn: true }))
    },
    register: async (data: Registration) => {
      validateCredentials(data)
      if (!data.name.trim()) throw new Error('Укажите имя')
      const [firstName, ...lastName] = data.name.trim().split(/\s+/)
      setState((current) => ({ ...current, loggedIn: true, mode: data.initial_role,
        profile: { ...current.profile, firstName, lastName: lastName.join(' '), email: data.email } }))
    },
    logout: async () => setState((current) => ({ ...current, loggedIn: false })),
    dismissNotice: () => setNotice(null),
  }
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

type PlatformState = Omit<DemoState, 'assignments'> & {
  user: { id: string; name: string; email: string; roles: AppMode[] }
  roles: AppMode[]
  loading: boolean
  scenario: StudentScenario
  assignment: DemoState['assignments'][number] | null
  currentMentor: Mentor | null
  claimedSlotIds: string[]
  notice: string | null
  noticeIsError: boolean
  unreadCount: number
  setScenario: (scenario: StudentScenario) => void
  setMode: (mode: AppMode) => void
  selectMentor: (mentor: Mentor) => Promise<boolean>
  requestMeeting: (mentor: Mentor, slot: TimeSlot) => Promise<boolean>
  cancelMeeting: (id: string) => Promise<boolean>
  updateMeetingStatus: (id: string, status: MeetingStatus) => Promise<boolean>
  addAvailability: (input: { date: string; time: string; duration: 60 | 75 | 90 }) => Promise<boolean>
  removeAvailability: (id: string) => Promise<boolean>
  saveReflection: (id: string, author: MeetingAudience, summary: string, nextStep?: string) => Promise<boolean>
  saveProfile: (profile: ProfileDraft) => Promise<boolean>
  markAllNotificationsRead: () => Promise<boolean>
  login: (credentials: Credentials) => Promise<void>
  register: (data: Registration) => Promise<void>
  logout: () => Promise<void>
  dismissNotice: () => void
}

const PlatformContext = createContext<PlatformState | null>(null)

export function usePlatformState() {
  const value = useContext(PlatformContext)
  if (!value) throw new Error('usePlatformState requires PlatformProvider')
  return value
}
