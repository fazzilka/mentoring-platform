import { useUserGateway } from '../../entities/user/model'

export function useAuthForm() {
  const { login, register, logout } = useUserGateway()
  return { login, register, logout }
}
