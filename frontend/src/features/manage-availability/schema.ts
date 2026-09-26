import { z } from 'zod'
import { meetingDurations } from '../../entities/availability/types'
import { zonedInstant } from '../../shared/lib/time'

export const durationSchema = z.union(meetingDurations.map(value => z.literal(value)))
export const createAvailabilitySchema = (timeZone: string) => z.object({
  date: z.iso.date('Укажите корректную дату'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Укажите корректное время'),
  duration: durationSchema,
}).refine(value => {
  try { return Date.parse(zonedInstant(value.date, value.time, timeZone)) > Date.now() }
  catch { return false }
}, {
  path: ['date'], message: 'Выберите будущие дату и время',
})

export const availabilitySchema = createAvailabilitySchema(Intl.DateTimeFormat().resolvedOptions().timeZone)
