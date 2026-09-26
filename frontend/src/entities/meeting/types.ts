import type { AppMode } from '../user/types'
import type { MeetingDuration } from '../availability/types'
export const meetingStatuses = ['pending', 'confirmed', 'completed', 'cancelled'] as const
export type MeetingStatus = typeof meetingStatuses[number]

export type MeetingAudience = AppMode

export interface Meeting {
  id: string
  startsAt: string
  title: string
  mentorId: string
  studentId: string
  mentorName: string
  studentName: string
  date: string
  time: string
  duration: MeetingDuration
  status: MeetingStatus
  meetingUrl?: string
  slotId?: string
}
