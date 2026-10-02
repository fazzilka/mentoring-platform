import { createGatewayContext } from '../../shared/lib/gateway'
import type { PlatformSnapshot } from '../gateway'

export type NotificationSnapshot = Pick<PlatformSnapshot, 'notifications' | 'unreadCount' | 'markAllNotificationsRead' | 'markNotificationRead'>
export const { Context: NotificationGatewayContext, useGateway: useNotificationGateway } = createGatewayContext<NotificationSnapshot>()
