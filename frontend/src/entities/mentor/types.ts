import type { TimeSlot } from '../availability/types'

export const specializations = ['Backend', 'Frontend', 'ML', 'DevOps'] as const
export type Specialization = typeof specializations[number]
export const mentorStatuses = ['online', 'away'] as const

export interface Mentor {
  id: string
  name: string
  initials: string
  avatarColor: string
  about: string
  specialization: Specialization
  skills: string[]
  experience: string
  company: string
  position: string
  timezone: string
  email: string | null
  telegramUsername: string | null
  phoneNumber: string | null
  acceptingStudents: boolean
  status: typeof mentorStatuses[number]
  availableSlots: TimeSlot[]
}
