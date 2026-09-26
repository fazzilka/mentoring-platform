export interface AppNotification {
  id: string
  title: string
  description: string
  time: string
  kind: 'meeting' | 'request' | 'note'
  read: boolean
}
