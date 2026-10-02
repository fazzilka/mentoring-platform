import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type UserSnapshot = Pick<PlatformSnapshot, 'profile' | 'roles' | 'mode' | 'setMode' | 'saveProfile'> & {
  user: PlatformSnapshot['user'] | null
  loggedIn: boolean
}
export const { Context: UserGatewayContext, useGateway: useUserGateway } = createGatewayContext<UserSnapshot>()
