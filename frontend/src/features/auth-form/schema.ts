import { z } from 'zod'
import { appModes } from '../../entities/user/types'

export const loginSchema = z.object({
  email: z.email('Укажите корректный email'),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
})
export const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'Укажите имя').max(160, 'Не более 160 символов'),
  initial_role: z.enum(appModes),
})
