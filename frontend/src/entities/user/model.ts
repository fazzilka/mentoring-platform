import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type UserSnapshot = Pick<PlatformSnapshot, 'user' | 'profile' | 'roles' | 'mode' | 'loggedIn' | 'login' | 'register' | 'logout' | 'setMode' | 'saveProfile'>
export const { Context: UserGatewayContext, useGateway: useUserGateway } = createGatewayContext<UserSnapshot>()
