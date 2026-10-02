import type { z } from 'zod'

export function formErrors<T>(schema: z.ZodType<T>, input: unknown): Record<string, string> {
  const result = schema.safeParse(input)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0] ?? 'form'), issue.message]))
}

export function parseForm<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw new Error(result.error.issues[0].message)
  return result.data
}
