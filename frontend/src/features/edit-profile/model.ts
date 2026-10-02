import { useUserGateway } from '../../entities/user/model'
import { useAuth } from '../../app/auth/AuthProvider'
import { profileSchema } from './schema'
import { parseForm } from '../../shared/lib/validation'
import type { ProfileDraft } from '../../entities'

export function useEditProfile() {
  const { saveProfile } = useUserGateway()
  const auth = useAuth()
  return { saveProfile: async (profile: ProfileDraft) => {
    const data = parseForm(profileSchema, profile)
    await auth.updateAccount(data)
    return saveProfile(data)
  } }
}
