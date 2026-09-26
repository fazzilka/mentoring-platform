import { Group, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Group justify="space-between" align="flex-end" gap="xl" className="page-header">
      <div>
        {eyebrow && <Text className="eyebrow">{eyebrow}</Text>}
        <Title order={1}>{title}</Title>
        {description && <Text c="dimmed" mt={8} maw={660}>{description}</Text>}
      </div>
      {action}
    </Group>
  )
}
