import { z } from 'zod'
import { durationSchema } from '../manage-availability/schema'

export const meetingRequestSchema = z.object({
  mentorId: z.string().min(1, 'Выберите наставника'),
  slotId: z.string().min(1, 'Выберите свободное время'),
  startsAt: z.iso.datetime({ offset: true }).refine(value => new Date(value).getTime() > Date.now(), 'Это время уже прошло'),
  duration: durationSchema,
})
