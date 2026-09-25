import { Button, Stack, Text, Title } from '@mantine/core'
import { IconInbox } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Surface } from './Surface'

export function EmptyContent({ title, description, action, icon }: {
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
}) {
  return (
    <Surface className="compact-empty">
      <Stack align="center" gap="sm">
        <div className="empty-icon">{icon ?? <IconInbox size={24} />}</div>
        <Title order={3} ta="center">{title}</Title>
        <Text size="sm" c="dimmed" ta="center" maw={460}>{description}</Text>
        {action && <Button variant="light" mt="xs" onClick={action.onClick}>{action.label}</Button>}
      </Stack>
    </Surface>
  )
}
