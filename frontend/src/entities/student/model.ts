import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type StudentSnapshot = Pick<PlatformSnapshot, 'students'>
export const { Context: StudentGatewayContext, useGateway: useStudentGateway } = createGatewayContext<StudentSnapshot>()
