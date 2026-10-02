import { z } from 'zod'

export const meetingLinkSchema = z.string().trim().min(1, 'Укажите ссылку').max(2048).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password }
  catch { return false }
}, 'Укажите HTTPS-ссылку на встречу')

export const mentorMeetingSchema = z.object({
  studentId: z.string().min(1, 'Выберите ученика'),
  slotId: z.string().min(1, 'Выберите свободное время'),
  meetingUrl: meetingLinkSchema,
})
