import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type MeetingSnapshot = Pick<PlatformSnapshot, 'meetings' | 'requestMeeting' | 'cancelMeeting' | 'updateMeetingStatus'>
export const { Context: MeetingGatewayContext, useGateway: useMeetingGateway } = createGatewayContext<MeetingSnapshot>()
