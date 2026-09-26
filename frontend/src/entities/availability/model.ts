import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type AvailabilitySnapshot = Pick<PlatformSnapshot, 'availability' | 'claimedSlotIds' | 'addAvailability' | 'removeAvailability'>
export const { Context: AvailabilityGatewayContext, useGateway: useAvailabilityGateway } = createGatewayContext<AvailabilitySnapshot>()
