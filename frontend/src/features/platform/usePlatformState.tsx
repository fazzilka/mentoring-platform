import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { api, authenticate, clearSession, hasSession } from '../../shared/api/client'
import { userSchema, type ApiAssignment, type ApiMeeting, type ApiMentor, type ApiNotification, type ApiReflection, type ApiSlot, type ApiStudentProfile, type ApiUser } from '../../entities/apiTypes'
import type { AppMode, AppNotification, AvailabilitySlot, Meeting, MeetingAudience, MeetingStatus, Mentor, MentorAssignment, ProfileDraft, Reflection, Student, StudentScenario, TimeSlot } from '../../shared/types'

type SlotInput = { date: string; time: string; duration: 60 | 75 | 90 }
type Credentials = { email: string; password: string }
type Registration = Credentials & { name: string; initial_role: AppMode }

interface PlatformState {
  user: ApiUser | null
  loggedIn: boolean
  loading: boolean
  roles: AppMode[]
  mode: AppMode
  scenario: StudentScenario
  currentMentor: Mentor | null
  assignment: MentorAssignment | null
  mentors: Mentor[]
  students: Student[]
  meetings: Meeting[]
  availability: AvailabilitySlot[]
  notifications: AppNotification[]
  reflections: Reflection[]
  profile: ProfileDraft
  claimedSlotIds: string[]
  notice: string | null
  unreadCount: number
  telegramConnected: boolean
  setMode: (mode: AppMode) => void
  selectMentor: (mentor: Mentor) => Promise<boolean>
  requestMeeting: (mentor: Mentor, slot: TimeSlot) => Promise<boolean>
  cancelMeeting: (meetingId: string) => Promise<boolean>
  updateMeetingStatus: (meetingId: string, status: MeetingStatus) => Promise<boolean>
  addAvailability: (slot: SlotInput) => Promise<boolean>
  removeAvailability: (slotId: string) => Promise<boolean>
  markAllNotificationsRead: () => Promise<boolean>
  saveReflection: (meetingId: string, author: MeetingAudience, summary: string, nextStep?: string) => Promise<boolean>
  saveProfile: (profile: ProfileDraft) => Promise<boolean>
  login: (credentials: Credentials) => Promise<void>
  register: (data: Registration) => Promise<void>
  logout: () => Promise<void>
  addRole: (role: AppMode) => Promise<boolean>
  connectTelegram: () => Promise<boolean>
  dismissNotice: () => void
}

const PlatformContext = createContext<PlatformState | null>(null)
const emptyProfile: ProfileDraft = {
  avatarUrl: '',
  firstName: '', lastName: '', email: '', timezone: 'Europe/Moscow',
  studentAbout: '', studentLevel: '', studentDirection: '', studentGoal: '',
  studentTechnologies: '', studentLearning: '', mentorAbout: '',
  mentorSpecialization: 'Backend', mentorSkills: '', mentorExperience: '',
  mentorCompany: '', mentorPosition: '', telemostUrl: '',
}

function dateParts(value: string) {
  const date = new Date(value)
  return {
    dateLabel: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date),
    date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date),
    time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date),
  }
}

function slotView(slot: ApiSlot): TimeSlot {
  return { id: slot.id, ...dateParts(slot.starts_at), duration: slot.duration_minutes }
}

function mentorView(profile: ApiMentor, slots: ApiSlot[]): Mentor {
  return {
    id: profile.user_id,
    name: profile.name,
    initials: profile.name.split(' ').map((part) => part[0]).slice(0, 2).join(''),
    avatarColor: '#e6e8ff',
    about: profile.about,
    specialization: profile.specialization,
    skills: profile.skills,
    experience: profile.experience,
    company: profile.company,
    position: profile.position,
    timezone: profile.timezone,
    acceptingStudents: profile.accepting_students,
    status: profile.status === 'active' ? 'online' : 'away',
    availableSlots: slots.filter((item) => item.status === 'free').map(slotView),
  }
}

function studentView(user: { id: string; name: string }, profile: ApiStudentProfile): Student {
  return {
    id: user.id, name: user.name,
    initials: user.name.split(' ').map((part) => part[0]).slice(0, 2).join(''),
    level: profile.current_level || 'Не указан',
    direction: profile.direction || 'Направление не указано',
    skills: profile.technologies,
    goal: profile.learning_goal || 'Цель пока не указана',
    about: profile.about,
  }
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [loggedIn, setLoggedIn] = useState(hasSession)
  const [mode, setSelectedMode] = useState<AppMode>(() => localStorage.getItem('platform-mode') === 'mentor' ? 'mentor' : 'student')
  const [notice, setNotice] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['me', loggedIn],
    queryFn: async () => userSchema.parse(await api<unknown>('/auth/me')),
    enabled: loggedIn,
    retry: false,
  })
  const user = meQuery.data ?? null
  const roles = user?.roles ?? []
  const student = Boolean(user && roles.includes('student'))
  const mentor = Boolean(user && roles.includes('mentor'))

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', user?.id],
    queryFn: () => api<ApiAssignment[]>('/assignments/me'),
    enabled: student,
  })
  const active = assignmentsQuery.data?.find((item) => item.status === 'active')
  const departed = assignmentsQuery.data?.some((item) => item.end_reason === 'mentor_departed')
  const scenario: StudentScenario = active ? 'active' : departed ? 'departed' : 'none'
  const assignment: MentorAssignment | null = active ? {
    id: active.id, mentorId: active.mentor_id, status: active.status,
    startDate: dateParts(active.created_at).dateLabel,
  } : null

  const catalogQuery = useQuery({
    queryKey: ['mentors', user?.id],
    queryFn: async () => {
      const profiles = await api<ApiMentor[]>('/mentors')
      return Promise.all(profiles.map(async (item) => mentorView(
        item, await api<ApiSlot[]>(`/mentors/${item.user_id}/slots`),
      )))
    },
    enabled: student && !active && assignmentsQuery.isSuccess,
  })
  const currentMentorQuery = useQuery({
    queryKey: ['current-mentor', active?.mentor_id],
    queryFn: async () => mentorView(
      await api<ApiMentor>(`/mentors/${active!.mentor_id}`),
      await api<ApiSlot[]>(`/mentors/${active!.mentor_id}/slots`),
    ),
    enabled: Boolean(active),
  })
  const currentMentor = currentMentorQuery.data ?? null
  const mentors = catalogQuery.data ?? (currentMentor ? [currentMentor] : [])

  const studentProfileQuery = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: () => api<ApiStudentProfile>('/profiles/student/me'),
    enabled: student,
  })
  const mentorProfileQuery = useQuery({
    queryKey: ['mentor-profile', user?.id],
    queryFn: () => api<ApiMentor>('/profiles/mentor/me'),
    enabled: mentor,
  })
  const availabilityQuery = useQuery({
    queryKey: ['availability', user?.id],
    queryFn: () => api<ApiSlot[]>(`/mentors/${user!.id}/slots`),
    enabled: mentor,
  })
  const meetingsQuery = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: () => api<ApiMeeting[]>('/meetings'),
    enabled: Boolean(user),
  })
  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => api<ApiNotification[]>('/notifications'),
    enabled: Boolean(user),
  })
  const telegramStatusQuery = useQuery({
    queryKey: ['telegram-status', user?.id],
    queryFn: () => api<{ connected: boolean }>('/telegram/status'),
    enabled: Boolean(user),
  })
  const studentsQuery = useQuery({
    queryKey: ['students', user?.id],
    queryFn: async () => {
      const people = await api<{ id: string; name: string }[]>('/students')
      return Promise.all(people.map(async (person) => studentView(
        person, await api<ApiStudentProfile>(`/students/${person.id}`),
      )))
    },
    enabled: mentor,
  })
  const students = studentsQuery.data ?? []
  const reflectionsQuery = useQuery({
    queryKey: ['reflections', user?.id, meetingsQuery.data?.map((item) => item.id).join(',')],
    queryFn: async () => (await Promise.all(
      (meetingsQuery.data ?? []).filter((item) => item.status === 'completed').map(
        (item) => api<ApiReflection[]>(`/meetings/${item.id}/reflections`),
      ),
    )).flat(),
    enabled: Boolean(user && meetingsQuery.data),
  })

  const meetings: Meeting[] = (meetingsQuery.data ?? []).map((item) => ({
    id: item.id, startsAt: item.starts_at, title: 'Встреча с наставником', mentorId: item.mentor_id,
    studentId: item.student_id,
    mentorName: user?.id === item.mentor_id ? user.name : currentMentor?.name ?? 'Наставник',
    studentName: user?.id === item.student_id ? user.name : students.find((person) => person.id === item.student_id)?.name ?? 'Ученик',
    ...dateParts(item.starts_at), duration: item.duration_minutes, status: item.status,
    meetingUrl: item.meeting_url ?? undefined, slotId: item.slot_id,
  }))
  const availability: AvailabilitySlot[] = (availabilityQuery.data ?? []).map((item) => ({
    ...slotView(item), state: item.status,
  }))
  const notifications: AppNotification[] = (notificationsQuery.data ?? []).map((item) => ({
    id: item.id, title: item.title, description: item.body,
    time: dateParts(item.created_at).dateLabel,
    kind: item.title.includes('заявка') ? 'request' : 'meeting',
    read: item.is_read,
  }))
  const reflections: Reflection[] = (reflectionsQuery.data ?? []).map((item) => ({
    id: item.id, meetingId: item.meeting_id, author: item.author_role,
    date: 'После встречи', summary: item.text,
  }))
  const profile: ProfileDraft = useMemo(() => {
    const [firstName = '', ...last] = user?.name.split(' ') ?? []
    const learner = studentProfileQuery.data
    const coach = mentorProfileQuery.data
    return {
      ...emptyProfile, avatarUrl: user?.avatar_url ?? '', firstName, lastName: last.join(' '), email: user?.email ?? '',
      timezone: learner?.timezone ?? coach?.timezone ?? 'Europe/Moscow',
      studentAbout: learner?.about ?? '', studentLevel: learner?.current_level ?? '',
      studentDirection: learner?.direction ?? '', studentGoal: learner?.learning_goal ?? '',
      studentTechnologies: learner?.technologies.join(', ') ?? '',
      studentLearning: learner?.wants_to_learn ?? '',
      mentorAbout: coach?.about ?? '', mentorSpecialization: coach?.specialization ?? 'Backend',
      mentorSkills: coach?.skills.join(', ') ?? '', mentorExperience: coach?.experience ?? '',
      mentorCompany: coach?.company ?? '', mentorPosition: coach?.position ?? '',
      telemostUrl: coach?.default_meeting_url ?? '',
    }
  }, [user, studentProfileQuery.data, mentorProfileQuery.data])

  const invalidate = async (skipCatalog = false) => {
    await queryClient.invalidateQueries({
      predicate: (query) => !skipCatalog || query.queryKey[0] !== 'mentors',
    })
  }
  const perform = async (
    action: () => Promise<unknown>, success: string, skipCatalog = false,
  ): Promise<boolean> => {
    try {
      await action()
      await invalidate(skipCatalog)
      setNotice(success)
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось выполнить действие')
      return false
    }
  }
  const setMode = (next: AppMode) => {
    if (roles.includes(next)) {
      setSelectedMode(next)
      localStorage.setItem('platform-mode', next)
    }
  }

  const value: PlatformState = {
    user, loggedIn, loading: loggedIn && meQuery.isPending, roles, mode, scenario,
    currentMentor, assignment, mentors, students, meetings, availability,
    notifications, reflections, profile,
    claimedSlotIds: (availabilityQuery.data ?? []).filter((item) => item.status !== 'free').map((item) => item.id),
    notice, unreadCount: notifications.filter((item) => !item.read).length,
    telegramConnected: telegramStatusQuery.data?.connected ?? false,
    setMode,
    selectMentor: (selected) => perform(
      () => api(`/assignments/${selected.id}`, { method: 'POST' }), 'Наставник выбран', true,
    ),
    requestMeeting: (_mentor, slot) => perform(
      () => api('/meetings', { method: 'POST', body: JSON.stringify({ slot_id: slot.id }) }),
      'Заявка на встречу отправлена',
    ),
    cancelMeeting: (id) => perform(
      () => api(`/meetings/${id}/cancel`, { method: 'POST' }), 'Встреча отменена',
    ),
    updateMeetingStatus: (id, status) => perform(
      () => api(`/meetings/${id}/${status === 'confirmed' ? 'confirm' : status === 'completed' ? 'complete' : 'reject'}`, { method: 'POST' }),
      status === 'confirmed' ? 'Встреча подтверждена' : 'Заявка обработана',
    ),
    addAvailability: (slot) => perform(
      () => api('/slots', { method: 'POST', body: JSON.stringify({ starts_at: new Date(`${slot.date}T${slot.time}`).toISOString(), duration_minutes: slot.duration }) }),
      'Свободное время добавлено',
    ),
    removeAvailability: (id) => perform(
      () => api(`/slots/${id}`, { method: 'DELETE' }), 'Свободное время удалено',
    ),
    markAllNotificationsRead: () => perform(
      () => api('/notifications/read-all', { method: 'POST' }), 'Уведомления прочитаны',
    ),
    saveReflection: (id, _author, summary, nextStep) => perform(
      () => api(`/meetings/${id}/reflections`, { method: 'POST', body: JSON.stringify({ text: nextStep ? `${summary}\nСледующий шаг: ${nextStep}` : summary }) }),
      'Приватная заметка сохранена',
    ),
    saveProfile: (updated) => perform(async () => {
      await api('/auth/me', { method: 'PUT', body: JSON.stringify({
        name: `${updated.firstName} ${updated.lastName}`.trim(), email: updated.email,
        avatar_url: updated.avatarUrl || null,
      }) })
      if (student) await api('/profiles/student/me', { method: 'PUT', body: JSON.stringify({
        about: updated.studentAbout, current_level: updated.studentLevel,
        direction: updated.studentDirection, learning_goal: updated.studentGoal,
        technologies: updated.studentTechnologies.split(',').map((value) => value.trim()).filter(Boolean),
        wants_to_learn: updated.studentLearning, timezone: updated.timezone,
      }) })
      if (mentor) await api('/profiles/mentor/me', { method: 'PUT', body: JSON.stringify({
        about: updated.mentorAbout, specialization: updated.mentorSpecialization,
        skills: updated.mentorSkills.split(',').map((value) => value.trim()).filter(Boolean),
        experience: updated.mentorExperience, company: updated.mentorCompany,
        position: updated.mentorPosition, timezone: updated.timezone,
        default_meeting_url: updated.telemostUrl || null, accepting_students: true,
      }) })
    }, 'Профиль сохранён'),
    login: async (credentials) => {
      await authenticate('/auth/login', credentials)
      setLoggedIn(true)
      await invalidate()
    },
    register: async (data) => {
      await authenticate('/auth/register', data)
      setSelectedMode(data.initial_role)
      setLoggedIn(true)
      await invalidate()
    },
    logout: async () => {
      try { await api('/auth/logout', { method: 'POST' }) } catch {
        // The local session must end even when the API is unavailable.
      } finally {
        clearSession(); setLoggedIn(false); queryClient.clear()
      }
    },
    addRole: (role) => perform(
      () => api('/auth/roles', { method: 'POST', body: JSON.stringify({ role }) }),
      'Роль добавлена',
    ),
    connectTelegram: () => perform(async () => {
      const result = await api<{ url: string }>('/telegram/link', { method: 'POST' })
      window.open(result.url, '_blank', 'noopener,noreferrer')
    }, 'Откройте Telegram для подключения'),
    dismissNotice: () => setNotice(null),
  }

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatformState() {
  const value = useContext(PlatformContext)
  if (!value) throw new Error('usePlatformState requires PlatformProvider')
  return value
}
