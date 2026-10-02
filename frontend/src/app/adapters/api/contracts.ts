import { z } from 'zod'
import { specializations } from '../../../entities/mentor/types'
import { meetingDurations, slotStates } from '../../../entities/availability/types'
import { meetingStatuses } from '../../../entities/meeting/types'
import { assignmentStatuses } from '../../../entities/assignment/types'

export const studentProfile = z.object({ user_id: z.string(), about: z.string(), level: z.string(), direction: z.string(), goal: z.string(), technologies: z.array(z.string()), learning_interests: z.string(), email: z.string().nullable(), telegram_username: z.string().nullable(), phone_number: z.string().nullable() })
export const mentorProfile = z.object({ user_id: z.string(), name: z.string(), avatar_url: z.string().nullable(), timezone: z.string(), about: z.string(), specialization: z.enum(specializations), skills: z.array(z.string()), experience_years: z.number(), company: z.string(), position: z.string(), accepting_students: z.boolean(), status: z.enum(['active', 'inactive', 'departed']), default_meeting_url: z.string().nullable(), email: z.string().nullable(), telegram_username: z.string().nullable(), phone_number: z.string().nullable() })
export const slotContract = z.object({ id: z.string(), mentor_id: z.string(), starts_at: z.string(), duration_minutes: z.union(meetingDurations.map(value => z.literal(value))), state: z.enum(slotStates) })
export const meetingContract = z.object({ id: z.string(), student_id: z.string(), mentor_id: z.string(), mentor_name: z.string(), student_name: z.string(), starts_at: z.string(), duration_minutes: z.union(meetingDurations.map(value => z.literal(value))), status: z.enum(meetingStatuses), meeting_url: z.string().nullable(), availability_slot_id: z.string() })
export const assignmentContract = z.object({ id: z.string(), mentor_id: z.string(), status: z.enum(assignmentStatuses), started_at: z.string(), ended_at: z.string().nullable(), end_reason: z.string().nullable() })
export const reflectionContract = z.object({ id: z.string(), meeting_id: z.string(), author_id: z.string(), summary: z.string(), next_step: z.string().nullable(), created_at: z.string() })
export const notificationContract = z.object({ id: z.string(), title: z.string(), message: z.string(), type: z.string(), read_at: z.string().nullable(), created_at: z.string() })
export const studentList = z.array(z.object({ id: z.string(), name: z.string() }))

export function dateLabel(value: string, timezone: string) { return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: timezone }) }
export function timeLabel(value: string, timezone: string) { return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: timezone }) }
export const initials = (name: string) => name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')
