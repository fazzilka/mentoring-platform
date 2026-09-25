import { Badge, Button, Group, Stack, Text, Title } from '@mantine/core'
import { IconArrowUpRight, IconBriefcase2, IconCalendarEvent } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import type { Mentor } from '../types'
import { AvatarMark } from './AvatarMark'
import { Surface } from './Surface'

export function MentorCard({ mentor }: { mentor: Mentor }) {
  const navigate = useNavigate()
  return (
    <Surface interactive className="mentor-card-wrap mentor-card">
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <AvatarMark initials={mentor.initials} color={mentor.avatarColor} size={54} />
          <Badge variant="light" color={mentor.acceptingStudents ? 'teal' : 'gray'}>
            {mentor.acceptingStudents ? 'Набирает учеников' : 'Мест пока нет'}
          </Badge>
        </Group>
        <div>
          <Text className="eyebrow">{mentor.specialization}</Text>
          <Title order={3} mt={4}>{mentor.name}</Title>
          <Text c="dimmed" size="sm" mt={4}>{mentor.position}</Text>
        </div>
        <Text size="sm" lineClamp={2} className="card-description">{mentor.about}</Text>
        <Group gap={6} className="tag-list">
          {mentor.skills.slice(0, 3).map((skill) => <Badge key={skill} variant="outline" color="gray">{skill}</Badge>)}
        </Group>
        <Stack gap={8} mt="auto" className="mentor-meta">
          <Group gap={8}><IconBriefcase2 size={16} /><Text size="sm" c="dimmed">{mentor.company}</Text></Group>
          <Text size="sm" c="dimmed">{mentor.experience}</Text>
          <Group gap={8}><IconCalendarEvent size={16} /><Text size="sm" c="dimmed">{mentor.availableSlots[0] ? `${mentor.availableSlots[0].dateLabel}, ${mentor.availableSlots[0].time}` : 'Свободных слотов пока нет'}</Text></Group>
        </Stack>
        <Button variant="subtle" px={0} w="fit-content" rightSection={<IconArrowUpRight size={17} />} onClick={() => navigate(`/student/mentors/${mentor.id}`)}>
          Подробнее
        </Button>
      </Stack>
    </Surface>
  )
}
