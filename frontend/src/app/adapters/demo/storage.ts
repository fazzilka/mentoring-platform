import { z } from 'zod'
import { appModes } from '../../../entities/user/types'
import { specializations, mentorStatuses } from '../../../entities/mentor/types'
import { assignmentStatuses } from '../../../entities/assignment/types'
import { slotStates } from '../../../entities/availability/types'
import { meetingStatuses } from '../../../entities/meeting/types'
import { durationSchema } from '../../../features/manage-availability/schema'
import { profileSchema } from '../../../features/edit-profile/schema'
import type { PlatformData } from '../../../entities/gateway'

const text = z.string()
const slot = z.object({ id: text, startsAt: z.iso.datetime({ offset: true }), dateLabel: text, date: text, time: text, duration: durationSchema })
export const demoStateSchema: z.ZodType<PlatformData> = z.object({
  loggedIn: z.boolean(), mode: z.enum(appModes), profile: profileSchema,
  mentors: z.array(z.object({ id: text, name: text, initials: text, avatarColor: text,
    about: text, specialization: z.enum(specializations), skills: z.array(text), experience: text,
    company: text, position: text, timezone: text, acceptingStudents: z.boolean(),
    status: z.enum(mentorStatuses), availableSlots: z.array(slot),
  })).min(1),
  students: z.array(z.object({ id: text, name: text, initials: text, level: text, direction: text,
    skills: z.array(text), goal: text, about: text })),
  meetings: z.array(z.object({ id: text, startsAt: z.iso.datetime({ offset: true }), title: text,
    mentorId: text, studentId: text, mentorName: text, studentName: text, date: text, time: text,
    duration: durationSchema, status: z.enum(meetingStatuses), meetingUrl: text.optional(), slotId: text.optional() })),
  assignments: z.array(z.object({ id: text, mentorId: text, status: z.enum(assignmentStatuses),
    startDate: text, endDate: text.optional(), endReason: z.literal('mentor_departed').optional() })),
  availability: z.array(slot.extend({ state: z.enum(slotStates) })),
  notifications: z.array(z.object({ id: text, title: text, description: text, time: text,
    kind: z.enum(['meeting', 'request', 'note']), read: z.boolean() })),
  reflections: z.array(z.object({ id: text, meetingId: text, author: z.enum(appModes),
    date: text, summary: text, nextStep: text.optional() })),
})
