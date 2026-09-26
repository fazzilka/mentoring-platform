import { useAuth } from '../../app/auth/AuthProvider'

export function useAuthForm() {
  const { login, register, logout } = useAuth()
  return { login, register, logout }
}
