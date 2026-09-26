import { useMeetingGateway } from '../entities/meeting/model'
import { useUserGateway } from '../entities/user/model'
import { useStudentGateway } from '../entities/student/model'
import { Badge, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconArrowRight, IconCalendarEvent, IconClock, IconUsers } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { AvatarMark } from '../shared/ui/AvatarMark'
import { MeetingList } from '../features/manage-meeting-request/MeetingList'
import { PageHeader } from '../shared/ui/PageHeader'
import { Surface } from '../shared/ui/Surface'

export function MentorDashboard() {
  const { meetings } = useMeetingGateway()
  const { profile, user } = useUserGateway()
  const { students } = useStudentGateway()
  const navigate = useNavigate()
  const ownMeetings = meetings.filter((meeting) => meeting.mentorId === user?.id)
  const pending = ownMeetings.filter((meeting) => meeting.status === 'pending')
  const upcoming = ownMeetings.filter((meeting) => meeting.status === 'confirmed').sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Обзор" title={`Доброе утро, ${profile.firstName}`} description="Сегодняшние встречи, новые заявки и ученики — в одном спокойном рабочем контексте." />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Surface><Group justify="space-between"><Text size="sm" c="dimmed">Мои ученики</Text><IconUsers size={19} /></Group><Title order={2} mt="lg">{students.length}</Title><Button variant="subtle" px={0} mt={5} size="xs" onClick={() => navigate('/mentor/students')}>Открыть список</Button></Surface>
        <Surface><Group justify="space-between"><Text size="sm" c="dimmed">Ближайшая встреча</Text><IconCalendarEvent size={19} /></Group><Title order={3} mt="lg">{upcoming[0] ? `${upcoming[0].date}, ${upcoming[0].time}` : 'Пока не назначена'}</Title><Text size="xs" c="dimmed" mt={5}>{upcoming[0] ? `${upcoming[0].studentName} · ${upcoming[0].duration} минут` : 'Подтвердите заявку ученика'}</Text></Surface>
        <Surface><Group justify="space-between"><Text size="sm" c="dimmed">Заявки на встречу</Text><IconClock size={19} /></Group><Title order={2} mt="lg">{pending.length}</Title><Button variant="subtle" px={0} mt={5} size="xs" onClick={() => navigate('/mentor/meetings')}>Рассмотреть заявки</Button></Surface>
      </SimpleGrid>
      <section><Group justify="space-between" mb="md"><Title order={2}>Ближайшие встречи</Title><Button variant="subtle" rightSection={<IconArrowRight size={15} />} onClick={() => navigate('/mentor/meetings')}>Все встречи</Button></Group><MeetingList meetings={upcoming} audience="mentor" compact /></section>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <section><Group justify="space-between" mb="md"><Title order={2}>Новые заявки</Title><Badge variant="light" color="yellow">{pending.length}</Badge></Group><MeetingList meetings={pending} audience="mentor" compact /></section>
        <section><Group justify="space-between" mb="md"><Title order={2}>Мои ученики</Title><Button variant="subtle" onClick={() => navigate('/mentor/students')}>Все ученики</Button></Group><Stack gap="sm">{students.slice(0, 3).map((student) => <Surface key={student.id} interactive><Group justify="space-between" wrap="nowrap"><Group wrap="nowrap"><AvatarMark initials={student.initials} color="#e8e4db" /><div><Text fw={650}>{student.name}</Text><Text size="sm" c="dimmed">{student.direction} · {student.level}</Text></div></Group><Button size="xs" variant="light" onClick={() => navigate(`/mentor/students/${student.id}`)}>Открыть</Button></Group></Surface>)}</Stack></section>
      </SimpleGrid>
    </Stack>
  )
}
