import { useUserGateway } from '../../entities/user/model'

export function useEditProfile() {
  const { saveProfile } = useUserGateway()
  return { saveProfile }
}
