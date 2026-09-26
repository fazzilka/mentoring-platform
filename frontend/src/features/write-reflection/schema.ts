import { z } from 'zod'

export const reflectionSchema = z.object({
  summary: z.string().trim().min(1, 'Напишите, что было важным на встрече').max(5000, 'Не более 5000 символов'),
  nextStep: z.string().trim().max(3000, 'Не более 3000 символов').optional(),
})
