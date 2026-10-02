import type { MeetingAudience } from '../meeting/types'

export interface Reflection {
  id: string
  meetingId: string
  author: MeetingAudience
  date: string
  summary: string
  nextStep?: string
}
