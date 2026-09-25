export type AppMode = 'student' | 'mentor'
export type StudentScenario = 'none' | 'active' | 'departed'
export type Specialization = 'Backend' | 'Frontend' | 'ML' | 'DevOps'
export type MeetingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type MeetingAudience = 'student' | 'mentor'

export interface TimeSlot {
  id: string
  dateLabel: string
  date: string
  time: string
  duration: 60 | 75 | 90
}

export interface AvailabilitySlot extends TimeSlot {
  state: 'free' | 'pending' | 'booked'
}

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
  acceptingStudents: boolean
  status: 'online' | 'away'
  availableSlots: TimeSlot[]
}

export interface MentorAssignment {
  id: string
  mentorId: string
  status: 'active' | 'ended'
  startDate: string
  endDate?: string
  endReason?: 'mentor_departed'
}

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
  duration: 60 | 75 | 90
  status: MeetingStatus
  meetingUrl?: string
  slotId?: string
}

export interface Student {
  id: string
  name: string
  initials: string
  level: string
  direction: string
  skills: string[]
  goal: string
  about: string
}

export interface Reflection {
  id: string
  meetingId: string
  author: MeetingAudience
  date: string
  summary: string
  nextStep?: string
}

export interface AppNotification {
  id: string
  title: string
  description: string
  time: string
  kind: 'meeting' | 'request' | 'note'
  read: boolean
}

export interface ProfileDraft {
  avatarUrl: string
  firstName: string
  lastName: string
  email: string
  timezone: string
  studentAbout: string
  studentLevel: string
  studentDirection: string
  studentGoal: string
  studentTechnologies: string
  studentLearning: string
  mentorAbout: string
  mentorSpecialization: string
  mentorSkills: string
  mentorExperience: string
  mentorCompany: string
  mentorPosition: string
  telemostUrl: string
}
