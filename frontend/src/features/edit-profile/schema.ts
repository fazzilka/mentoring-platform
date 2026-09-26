import { z } from 'zod'
import { specializations } from '../../entities/mentor/types'

const text = z.string().max(3000, 'Не более 3000 символов')
const optionalUrl = z.string().max(2048, 'Не более 2048 символов').refine(value => {
  if (!value) return true
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username }
  catch { return false }
}, 'Укажите ссылку http или https')
export const profileSchema = z.object({
  avatarUrl: optionalUrl,
  firstName: z.string().trim().min(1, 'Укажите имя').max(100, 'Не более 100 символов'),
  lastName: z.string().trim().max(100, 'Не более 100 символов'),
  email: z.email('Укажите корректный email'),
  timezone: z.string().refine(value => {
    try { new Intl.DateTimeFormat('ru', { timeZone: value }); return Boolean(value) } catch { return false }
  }, 'Укажите существующий часовой пояс'),
  studentAbout: text, studentLevel: z.string().max(100, 'Не более 100 символов'), studentDirection: z.string().max(100, 'Не более 100 символов'), studentGoal: text,
  studentTechnologies: text.refine(value => value.split(',').filter(item => item.trim()).length <= 50, 'Не более 50 технологий'), studentLearning: text, mentorAbout: text,
  mentorSpecialization: z.enum(specializations), mentorSkills: text.refine(value => value.split(',').filter(item => item.trim()).length <= 50, 'Не более 50 навыков'),
  mentorExperience: z.string().refine(value => value === '' || /^\d{1,3}$/.test(value) && Number(value) <= 100, 'Укажите целое количество лет от 0 до 100'),
  mentorCompany: z.string().max(160, 'Не более 160 символов'), mentorPosition: z.string().max(160, 'Не более 160 символов'),
  telemostUrl: z.string().max(2048, 'Не более 2048 символов').refine(value => {
    if (!value) return true
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'telemost.yandex.ru' && !url.username }
    catch { return false }
  }, 'Укажите HTTPS-ссылку на Телемост'),
}).refine(profile => `${profile.firstName} ${profile.lastName}`.trim().length <= 160, {
  message: 'Полное имя не должно превышать 160 символов', path: ['lastName'],
})
