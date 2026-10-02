import { Button, Group, Text } from '@mantine/core'
import { IconBrandTelegram, IconMail, IconPhone } from '@tabler/icons-react'

export function ContactLinks({ email, telegramUsername, phoneNumber }: {
  email: string | null
  telegramUsername: string | null
  phoneNumber: string | null
}) {
  if (!email && !telegramUsername && !phoneNumber) {
    return <Text size="sm" c="dimmed">Контакты пока не указаны</Text>
  }
  return <Group gap="xs">
    {telegramUsername && <Button component="a" href={`https://t.me/${encodeURIComponent(telegramUsername)}`} target="_blank" rel="noreferrer" variant="light" leftSection={<IconBrandTelegram size={16} />}>@{telegramUsername}</Button>}
    {phoneNumber && <Button component="a" href={`tel:${phoneNumber}`} variant="light" leftSection={<IconPhone size={16} />}>{phoneNumber}</Button>}
    {email && <Button component="a" href={`mailto:${email}`} variant="light" leftSection={<IconMail size={16} />}>Написать на почту</Button>}
  </Group>
}
