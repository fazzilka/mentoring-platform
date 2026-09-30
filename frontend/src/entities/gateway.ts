import type { AppMode, AppNotification, AvailabilitySlot, Meeting, Mentor, MentorAssignment, ProfileDraft, Reflection, Student, StudentScenario, MeetingAudience, MeetingStatus, TimeSlot } from './index'
import type { AvailabilityInput } from './availability/types'

export interface PlatformData {
  mode: AppMode
  profile: ProfileDraft
  mentors: Mentor[]
  students: Student[]
  meetings: Meeting[]
  assignments: MentorAssignment[]
  availability: AvailabilitySlot[]
  notifications: AppNotification[]
  reflections: Reflection[]
}

export type PlatformSnapshot = Omit<PlatformData, 'assignments'> & {
  user: { id: string; name: string; email: string; roles: AppMode[] }
  roles: AppMode[]
  scenario: StudentScenario
  assignment: PlatformData['assignments'][number] | null
  currentMentor: Mentor | null
  claimedSlotIds: string[]
  notice: string | null
  noticeIsError: boolean
  unreadCount: number
  departMentor: () => Promise<boolean>
  setMode: (mode: AppMode) => void
  selectMentor: (mentor: Mentor) => Promise<boolean>
  requestMeeting: (mentor: Mentor, slot: TimeSlot) => Promise<boolean>
  createMentorMeeting: (studentId: string, slotId: string, meetingUrl: string) => Promise<boolean>
  cancelMeeting: (id: string) => Promise<boolean>
  updateMeetingStatus: (id: string, status: MeetingStatus, meetingUrl?: string) => Promise<boolean>
  addAvailability: (input: AvailabilityInput) => Promise<boolean>
  removeAvailability: (id: string) => Promise<boolean>
  saveReflection: (id: string, author: MeetingAudience, summary: string, nextStep?: string) => Promise<boolean>
  saveProfile: (profile: ProfileDraft) => Promise<boolean>
  markAllNotificationsRead: () => Promise<boolean>
  markNotificationRead: (id: string) => Promise<boolean>
  dismissNotice: () => void
}


export interface PlatformGateway { getSnapshot: () => PlatformSnapshot; subscribe: (listener: () => void) => () => void; load: (view?: string) => Promise<void> }
