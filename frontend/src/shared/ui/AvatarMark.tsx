import { Avatar } from '@mantine/core'

export function AvatarMark({ initials, color, size = 48 }: {
  initials: string
  color: string
  size?: number
}) {
  return (
    <Avatar size={size} radius="xl" color="dark" styles={{ root: { backgroundColor: color } }} aria-label={`Аватар ${initials}`}>
      {initials}
    </Avatar>
  )
}
