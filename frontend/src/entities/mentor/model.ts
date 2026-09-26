import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type MentorSnapshot = Pick<PlatformSnapshot, 'mentors'>
export const { Context: MentorGatewayContext, useGateway: useMentorGateway } = createGatewayContext<MentorSnapshot>()
