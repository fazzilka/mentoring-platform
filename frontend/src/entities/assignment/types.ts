export const studentScenarios = ['none', 'active', 'departed'] as const
export const assignmentStatuses = ['active', 'ended'] as const
export type StudentScenario = typeof studentScenarios[number]

export interface MentorAssignment {
  id: string
  mentorId: string
  status: typeof assignmentStatuses[number]
  startDate: string
  endDate?: string
  endReason?: 'mentor_departed'
}
