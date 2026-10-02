import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type AssignmentSnapshot = Pick<PlatformSnapshot, 'scenario' | 'assignment' | 'currentMentor' | 'departMentor' | 'selectMentor'>
export const { Context: AssignmentGatewayContext, useGateway: useAssignmentGateway } = createGatewayContext<AssignmentSnapshot>()
