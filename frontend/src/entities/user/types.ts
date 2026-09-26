export const appModes = ['student', 'mentor'] as const
export type AppMode = typeof appModes[number]
export interface Credentials { email: string; password: string }
export interface Registration extends Credentials { name: string; initial_role: AppMode }

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
