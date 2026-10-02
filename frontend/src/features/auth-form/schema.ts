import { z } from 'zod'
import { appModes } from '../../entities/user/types'

export const loginSchema = z.object({
  email: z.email('Укажите корректный email'),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов').max(128, 'Не более 128 символов'),
})
export const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'Укажите имя').max(160, 'Не более 160 символов').refine(value => {
    const [first = '', ...last] = value.split(/\s+/)
    return first.length <= 100 && last.join(' ').length <= 100
  }, 'Имя и фамилия не должны превышать 100 символов'),
  initial_role: z.enum(appModes),
})
