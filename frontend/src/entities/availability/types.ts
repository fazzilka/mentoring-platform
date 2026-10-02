export const meetingDurations = [60, 75, 90] as const
export const slotStates = ['free', 'pending', 'booked'] as const
export type MeetingDuration = typeof meetingDurations[number]
export interface AvailabilityInput { date: string; time: string; duration: MeetingDuration }
export interface TimeSlot {
  id: string
  startsAt: string
  dateLabel: string
  date: string
  time: string
  duration: MeetingDuration
}

export interface AvailabilitySlot extends TimeSlot {
  state: typeof slotStates[number]
}
