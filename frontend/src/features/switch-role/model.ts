import { useUserGateway } from '../../entities/user/model'

export function useSwitchRole() {
  const { setMode } = useUserGateway()
  return { setMode }
}
