import { z } from 'zod'
import { meetingDurations } from '../../entities/availability/types'

export const durationSchema = z.union(meetingDurations.map(value => z.literal(value)))
export const availabilitySchema = z.object({
  date: z.iso.date('Укажите корректную дату'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Укажите корректное время'),
  duration: durationSchema,
}).refine(value => new Date(`${value.date}T${value.time}`).getTime() > Date.now(), {
  path: ['date'], message: 'Выберите будущие дату и время',
})
