import { z } from 'zod'

const base = (import.meta.env?.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
const messages: Record<number, string> = {
  401: 'Сессия завершена. Войдите снова.', 403: 'Недостаточно прав.', 404: 'Запись не найдена.',
  409: 'Данные изменились. Обновите страницу.', 422: 'Проверьте введённые данные.',
  500: 'Ошибка сервера. Попробуйте позже.', 503: 'Сервис временно недоступен.',
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function httpRequest(path: string, init: RequestInit = {}, access?: string | null): Promise<unknown> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (access) headers.set('Authorization', `Bearer ${access}`)
  let response: Response
  try { response = await fetch(`${base}${path}`, { ...init, credentials: 'include', headers }) }
  catch { throw new Error('Не удалось связаться с сервером. Проверьте подключение.') }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const detail = z.object({ detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]) }).safeParse(payload)
    const message = detail.success ? typeof detail.data.detail === 'string' ? detail.data.detail
      : detail.data.detail.map(item => item.msg).join('; ') : messages[response.status] ?? 'Не удалось выполнить запрос'
    throw new HttpError(response.status, response.status >= 500 ? messages[response.status] ?? messages[500] : message)
  }
  return response.status === 204 ? null : response.json()
}
