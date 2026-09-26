import { z } from 'zod'
import { appModes, type Credentials, type Registration, type ProfileDraft } from '../../entities/user/types'

const api = (import.meta.env?.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
const tokenSchema = z.object({ access_token: z.string(), expires_in: z.number().positive() })
const userSchema = z.object({
  id: z.string().uuid(), name: z.string(), email: z.string(), roles: z.array(z.enum(appModes)).min(1),
  first_name: z.string(), last_name: z.string(), timezone: z.string(), avatar_url: z.string().nullable(),
})
export type AuthUser = z.infer<typeof userSchema>
export interface AuthSnapshot {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error'
  user: AuthUser | null
  error: string
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function createAuthClient() {
  let token: string | null = null
  let expiresAt = 0
  let generation = 0
  let snapshot: AuthSnapshot = { status: 'loading', user: null, error: '' }
  let refreshPromise: Promise<void> | null = null
  let restorePromise: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const publish = (next: AuthSnapshot) => { snapshot = next; listeners.forEach(listener => listener()) }
  const clear = () => { token = null; expiresAt = 0; publish({ status: 'anonymous', user: null, error: '' }) }

  async function request(path: string, init: RequestInit = {}, access?: string | null): Promise<unknown> {
    const response = await fetch(`${api}${path}`, {
      ...init, credentials: 'include', headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}), ...init.headers,
      },
    })
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null)
      const detail = z.object({ detail: z.string() }).safeParse(payload)
      throw new HttpError(response.status, detail.success ? detail.data.detail : 'Не удалось выполнить запрос')
    }
    return response.status === 204 ? null : response.json()
  }

  async function authenticate(path: string, body?: Credentials | Registration) {
    const current = generation
    const result = tokenSchema.parse(await request(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }))
    const user = userSchema.parse(await request('/auth/me', {}, result.access_token))
    if (current !== generation) return
    token = result.access_token
    expiresAt = Date.now() + result.expires_in * 1000
    publish({ status: 'authenticated', user, error: '' })
  }

  const refresh = (): Promise<void> => {
    if (!refreshPromise) refreshPromise = authenticate('/auth/refresh').catch((error: unknown) => {
      if (error instanceof HttpError && error.status === 401) clear()
      throw error
    }).finally(() => { refreshPromise = null })
    return refreshPromise
  }
  const restore = (): Promise<void> => {
    if (!restorePromise) restorePromise = refresh().catch((error: unknown) => {
      if (!(error instanceof HttpError && error.status === 401)) {
        publish({ status: 'error', user: null, error: 'Сервер недоступен. Попробуйте восстановить сессию ещё раз.' })
      }
    }).finally(() => { restorePromise = null })
    return restorePromise
  }

  async function authorizedRequest(path: string, init: RequestInit = {}) {
    if (!token || Date.now() >= expiresAt - 1000) await refresh()
    try { return await request(path, init, token) } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) throw error
      await refresh()
      return request(path, init, token)
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    restore, refresh,
    login: async (data: Credentials) => {
      if (restorePromise) await restorePromise
      if (refreshPromise) await refreshPromise.catch(() => undefined)
      await authenticate('/auth/login', data)
    },
    register: async (data: Registration) => {
      if (restorePromise) await restorePromise
      if (refreshPromise) await refreshPromise.catch(() => undefined)
      await authenticate('/auth/register', data)
    },
    logout: async () => {
      // Finish a pending rotation before revoking the cookie that it issued.
      if (refreshPromise) await refreshPromise.catch(() => undefined)
      await request('/auth/logout', { method: 'POST' })
      generation += 1
      clear()
    },
    authorizedRequest,
    updateAccount: async (profile: ProfileDraft) => {
      const current = generation
      const user = userSchema.parse(await authorizedRequest('/auth/me', { method: 'PUT', body: JSON.stringify({
        first_name: profile.firstName, last_name: profile.lastName, email: profile.email,
        timezone: profile.timezone, avatar_url: profile.avatarUrl || null,
      }) }))
      if (current === generation) publish({ status: 'authenticated', user, error: '' })
    },
    expiresAt: () => expiresAt,
  }
}
