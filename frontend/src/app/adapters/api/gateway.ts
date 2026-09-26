import { QueryObserver, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { AuthUser, createAuthClient } from '../../auth/client'
import type { PlatformData, PlatformGateway, PlatformSnapshot } from '../../../entities/gateway'
import type { Mentor, ProfileDraft } from '../../../entities'
import { profileSchema } from '../../../features/edit-profile/schema'
import { reflectionSchema } from '../../../features/write-reflection/schema'
import { createAvailabilitySchema } from '../../../features/manage-availability/schema'
import { parseForm } from '../../../shared/lib/validation'
import * as dto from './contracts'
import { zonedInstant } from '../../../shared/lib/time'

export function createApiGateway(client: QueryClient, auth: ReturnType<typeof createAuthClient>, user: AuthUser): PlatformGateway {
  const key = ['platform', user.id] as const
  let mode = user.roles[0]
  let notice: string | null = null
  let noticeIsError = false
  const listeners = new Set<() => void>()
  const profile: ProfileDraft = {
    firstName: user.first_name, lastName: user.last_name, email: user.email, timezone: user.timezone,
    avatarUrl: user.avatar_url ?? '', studentAbout: '', studentLevel: '', studentDirection: '', studentGoal: '',
    studentTechnologies: '', studentLearning: '', mentorAbout: '', mentorSpecialization: 'Backend', mentorSkills: '',
    mentorExperience: '', mentorCompany: '', mentorPosition: '', telemostUrl: '',
  }
  const empty: Omit<PlatformData, 'mode'> = { profile, mentors: [], students: [], assignments: [], availability: [], meetings: [], reflections: [], notifications: [] }
  const request = auth.authorizedRequest
  const get = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
    const result = schema.safeParse(await request(path))
    if (!result.success) throw new Error('Сервер вернул данные неожиданного формата. Попробуйте обновить страницу.')
    return result.data
  }
  const write = (path: string, body?: unknown, method = 'POST') => request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  async function fetchData(): Promise<Omit<PlatformData, 'mode'>> {
    const account = auth.getSnapshot().user ?? user
    const student = user.roles.includes('student')
    const mentor = user.roles.includes('mentor')
    const [studentData, mentorData, catalog, assignments, people, meetings, notifications] = await Promise.all([
      student ? get('/profiles/student/me', dto.studentProfile) : null,
      mentor ? get('/profiles/mentor/me', dto.mentorProfile) : null,
      student ? get('/mentors', z.array(dto.mentorProfile)) : [],
      student ? get('/assignments/me', z.array(dto.assignmentContract)) : [],
      mentor ? get('/students', dto.studentList) : [],
      get('/meetings', z.array(dto.meetingContract)), get('/notifications', z.array(dto.notificationContract)),
    ])
    const mentorsById = new Map(catalog.map(item => [item.user_id, item]))
    if (mentorData) mentorsById.set(user.id, mentorData)
    for (const item of assignments) if (!mentorsById.has(item.mentor_id)) mentorsById.set(item.mentor_id, await get(`/mentors/${item.mentor_id}`, dto.mentorProfile))
    const mentors = await Promise.all([...mentorsById.values()].map(async item => {
      const slots = await get(`/mentors/${item.user_id}/slots`, z.array(dto.slotContract))
      const mapped: Mentor = { id: item.user_id, name: item.name, initials: dto.initials(item.name), avatarColor: '#e7e4dc',
        about: item.about, specialization: item.specialization, skills: item.skills, experience: `${item.experience_years} лет опыта`,
        company: item.company, position: item.position, timezone: item.timezone, acceptingStudents: item.accepting_students,
        status: item.status === 'active' ? 'online' : 'away',
        availableSlots: slots.filter(slot => slot.state === 'free' && new Date(slot.starts_at) > new Date()).map(slot => ({ id: slot.id, startsAt: slot.starts_at,
          date: dto.dateLabel(slot.starts_at, account.timezone), dateLabel: dto.dateLabel(slot.starts_at, account.timezone), time: dto.timeLabel(slot.starts_at, account.timezone), duration: slot.duration_minutes })),
      }
      return mapped
    }))
    const students = await Promise.all(people.map(async person => {
      const item = await get(`/students/${person.id}`, dto.studentProfile)
      return { id: person.id, name: person.name, initials: dto.initials(person.name), level: item.level, direction: item.direction, skills: item.technologies, goal: item.goal, about: item.about }
    }))
    const ownSlots = mentor ? await get(`/mentors/${user.id}/slots`, z.array(dto.slotContract)) : []
    const notes = (await Promise.all(meetings.map(item => get(`/meetings/${item.id}/reflections`, z.array(dto.reflectionContract))))).flat()
    const resultProfile = { ...profile, firstName: account.first_name, lastName: account.last_name, email: account.email, timezone: account.timezone, avatarUrl: account.avatar_url ?? '',
      ...(studentData ? { studentAbout: studentData.about, studentLevel: studentData.level, studentDirection: studentData.direction, studentGoal: studentData.goal, studentTechnologies: studentData.technologies.join(', '), studentLearning: studentData.learning_interests } : {}),
      ...(mentorData ? { mentorAbout: mentorData.about, mentorSpecialization: mentorData.specialization, mentorSkills: mentorData.skills.join(', '), mentorExperience: String(mentorData.experience_years), mentorCompany: mentorData.company, mentorPosition: mentorData.position, telemostUrl: mentorData.default_meeting_url ?? '' } : {}),
    }
    return { profile: resultProfile, mentors, students,
      assignments: assignments.map(item => ({ id: item.id, mentorId: item.mentor_id, status: item.status, startDate: dto.dateLabel(item.started_at, account.timezone), endDate: item.ended_at ? dto.dateLabel(item.ended_at, account.timezone) : undefined, endReason: item.end_reason === 'mentor_departed' ? 'mentor_departed' : undefined })),
      availability: ownSlots.map(item => ({ id: item.id, startsAt: item.starts_at, date: dto.dateLabel(item.starts_at, account.timezone), dateLabel: dto.dateLabel(item.starts_at, account.timezone), time: dto.timeLabel(item.starts_at, account.timezone), duration: item.duration_minutes, state: item.state })),
      meetings: meetings.map(item => ({ id: item.id, title: 'Встреча с наставником', mentorId: item.mentor_id, studentId: item.student_id, mentorName: item.mentor_name, studentName: item.student_name, startsAt: item.starts_at, date: dto.dateLabel(item.starts_at, account.timezone), time: dto.timeLabel(item.starts_at, account.timezone), duration: item.duration_minutes, status: item.status, meetingUrl: item.meeting_url ?? undefined, slotId: item.availability_slot_id })),
      reflections: notes.map(item => ({ id: item.id, meetingId: item.meeting_id, author: meetings.find(meeting => meeting.id === item.meeting_id)?.student_id === item.author_id ? 'student' : 'mentor', date: dto.dateLabel(item.created_at, account.timezone), summary: item.summary, nextStep: item.next_step ?? undefined })),
      notifications: notifications.map(item => ({ id: item.id, title: item.title, description: item.message, time: `${dto.dateLabel(item.created_at, account.timezone)}, ${dto.timeLabel(item.created_at, account.timezone)}`, kind: item.type === 'meeting_requested' ? 'request' : 'meeting', read: Boolean(item.read_at) })),
    }
  }
  const options = { queryKey: key, queryFn: fetchData, staleTime: 0, retry: false as const, refetchInterval: 30_000 }
  const observer = new QueryObserver(client, options)
  let snapshot: PlatformSnapshot
  const publish = () => { snapshot = buildSnapshot(); listeners.forEach(listener => listener()) }
  const mutation = async (operation: () => Promise<unknown>, message: string): Promise<boolean> => {
    try {
      await client.getMutationCache().build(client, { mutationFn: operation }).execute(undefined)
      await client.invalidateQueries({ queryKey: key, refetchType: 'none' })
      await client.fetchQuery(options)
      notice = message; noticeIsError = false; publish(); return true
    } catch (error) { notice = error instanceof Error ? error.message : 'Не удалось сохранить изменения'; noticeIsError = true; publish(); return false }
  }
  function buildSnapshot(): PlatformSnapshot {
    const data = client.getQueryData<Omit<PlatformData, 'mode'>>(key) ?? empty
    const assignment = data.assignments.find(item => item.status === 'active') ?? null
    return { ...data, mode, user, roles: user.roles, assignment,
      scenario: assignment ? 'active' : data.assignments.some(item => item.endReason === 'mentor_departed') ? 'departed' : 'none',
      currentMentor: data.mentors.find(item => item.id === assignment?.mentorId) ?? null,
      claimedSlotIds: data.meetings.filter(item => ['pending', 'confirmed'].includes(item.status)).flatMap(item => item.slotId ? [item.slotId] : []),
      notice: notice ?? (observer.getCurrentResult().error ? 'Не удалось обновить данные. Проверьте подключение и перезагрузите страницу.' : null),
      noticeIsError: noticeIsError || Boolean(observer.getCurrentResult().error), unreadCount: data.notifications.filter(item => !item.read).length,
      setMode: next => { if (user.roles.includes(next)) { mode = next; publish() } },
      dismissNotice: () => { notice = null; publish() },
      selectMentor: mentor => mutation(() => write('/assignments', { mentor_id: mentor.id }), 'Наставник выбран'),
      departMentor: () => mutation(() => write('/profiles/mentor/depart'), 'Работа наставником завершена'),
      requestMeeting: (_mentor, slot) => mutation(() => write('/meetings', { availability_slot_id: slot.id }), 'Заявка отправлена'),
      cancelMeeting: id => mutation(() => write(`/meetings/${id}/cancel`), 'Встреча отменена'),
      updateMeetingStatus: (id, status) => mutation(() => write(`/meetings/${id}/${status === 'confirmed' ? 'confirm' : status === 'completed' ? 'complete' : 'reject'}`), 'Статус встречи изменён'),
      addAvailability: input => mutation(() => {
        const timeZone = auth.getSnapshot().user?.timezone ?? user.timezone
        const value = parseForm(createAvailabilitySchema(timeZone), input)
        return write('/slots', { starts_at: zonedInstant(value.date, value.time, timeZone), duration_minutes: value.duration })
      }, 'Свободное время добавлено'),
      removeAvailability: id => mutation(() => write(`/slots/${id}`, undefined, 'DELETE'), 'Слот удалён'),
      saveReflection: (id, author, summary, nextStep) => mutation(() => {
        const value = parseForm(reflectionSchema, { summary, nextStep })
        const existing = data.reflections.find(item => item.meetingId === id && item.author === author)
        return write(existing ? `/reflections/${existing.id}` : `/meetings/${id}/reflections`, { summary: value.summary, next_step: value.nextStep ?? null }, existing ? 'PUT' : 'POST')
      }, 'Приватная заметка сохранена'),
      saveProfile: input => mutation(async () => {
        const value = parseForm(profileSchema, input)
        if (user.roles.includes('student')) await write('/profiles/student/me', { about: value.studentAbout, level: value.studentLevel, direction: value.studentDirection, goal: value.studentGoal, technologies: value.studentTechnologies.split(',').map(item => item.trim()).filter(Boolean), learning_interests: value.studentLearning }, 'PUT')
        if (user.roles.includes('mentor')) {
          const current = await get('/profiles/mentor/me', dto.mentorProfile)
          if (current.status !== 'departed') await write('/profiles/mentor/me', { about: value.mentorAbout, specialization: value.mentorSpecialization, skills: value.mentorSkills.split(',').map(item => item.trim()).filter(Boolean), experience_years: Number(value.mentorExperience || 0), company: value.mentorCompany, position: value.mentorPosition, default_meeting_url: value.telemostUrl || null, accepting_students: current.accepting_students, status: current.status }, 'PUT')
        }
      }, 'Профиль сохранён'),
      markAllNotificationsRead: () => mutation(() => write('/notifications/read-all'), 'Уведомления прочитаны'),
      markNotificationRead: id => mutation(() => write(`/notifications/${id}/read`), 'Уведомление прочитано'),
    }
  }
  snapshot = buildSnapshot()
  let stop: (() => void) | undefined
  return { getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); if (!stop) stop = observer.subscribe(publish); return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = undefined } } },
    load: async () => { await client.fetchQuery(options); publish() },
  }
}
