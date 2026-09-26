import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(), name: z.string(), email: z.string(), avatar_url: z.string().nullable(),
  roles: z.array(z.enum(['student', 'mentor'])),
})
export type ApiUser = z.infer<typeof userSchema>

export interface ApiMentor {
  user_id: string
  name: string
  avatar_url: string | null
  about: string
  specialization: 'Backend' | 'Frontend' | 'ML' | 'DevOps'
  skills: string[]
  experience: string
  company: string
  position: string
  timezone: string
  default_meeting_url: string | null
  accepting_students: boolean
  status: 'active' | 'departed'
}

export interface ApiStudentProfile {
  user_id: string
  about: string
  current_level: string
  direction: string
  learning_goal: string
  technologies: string[]
  wants_to_learn: string
  timezone: string
}

export interface ApiAssignment {
  id: string
  student_id: string
  mentor_id: string
  status: 'active' | 'ended'
  end_reason: string | null
  created_at: string
  ended_at: string | null
}

export interface ApiSlot {
  id: string
  mentor_id: string
  starts_at: string
  duration_minutes: 60 | 75 | 90
  status: 'free' | 'pending' | 'booked'
}

export interface ApiMeeting {
  id: string
  student_id: string
  mentor_id: string
  slot_id: string
  starts_at: string
  duration_minutes: 60 | 75 | 90
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  meeting_url: string | null
  cancellation_reason: string | null
}

export interface ApiReflection {
  id: string
  meeting_id: string
  author_user_id: string
  author_role: 'student' | 'mentor'
  text: string
}

export interface ApiNotification {
  id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}
