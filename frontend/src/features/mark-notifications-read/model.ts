import { useNotificationGateway } from '../../entities/notification/model'

export function useMarkNotificationsRead() {
  const { markAllNotificationsRead } = useNotificationGateway()
  return { markAllNotificationsRead }
}
