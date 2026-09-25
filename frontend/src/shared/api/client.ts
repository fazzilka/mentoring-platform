import { z } from 'zod'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
const tokenSchema = z.object({ access_token: z.string(), refresh_token: z.string() })

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function hasSession() {
  return Boolean(sessionStorage.getItem('refresh_token'))
}

export function clearSession() {
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
}

function saveTokens(value: unknown) {
  const tokens = tokenSchema.parse(value)
  sessionStorage.setItem('access_token', tokens.access_token)
  sessionStorage.setItem('refresh_token', tokens.refresh_token)
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { detail?: unknown }
    const message = typeof data.detail === 'string' ? data.detail : `Ошибка запроса: ${response.status}`
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem('refresh_token')
  if (!refreshToken) return false
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).then(async (response) => {
      if (!response.ok) { clearSession(); return false }
      saveTokens(await response.json())
      return true
    }).catch(() => false).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const accessToken = sessionStorage.getItem('access_token')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  let response = await fetch(`${apiUrl}${path}`, { ...options, headers })
  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
    if (await refreshSession()) {
      headers.set('Authorization', `Bearer ${sessionStorage.getItem('access_token')}`)
      response = await fetch(`${apiUrl}${path}`, { ...options, headers })
    }
  }
  return parseResponse<T>(response)
}

export async function authenticate(
  path: '/auth/login' | '/auth/register',
  body: Record<string, string>,
) {
  const tokens = await api<unknown>(path, { method: 'POST', body: JSON.stringify(body) })
  saveTokens(tokens)
}
