import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type ReflectionSnapshot = Pick<PlatformSnapshot, 'reflections' | 'saveReflection'>
export const { Context: ReflectionGatewayContext, useGateway: useReflectionGateway } = createGatewayContext<ReflectionSnapshot>()
