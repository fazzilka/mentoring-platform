import { useAssignmentGateway } from '../entities/assignment/model'
import { useMeetingGateway } from '../entities/meeting/model'
import { useUserGateway } from '../entities/user/model'
import { Badge, Button, Grid, Group, Stack, Text, Title } from '@mantine/core'
import { IconCalendarEvent, IconClock, IconExternalLink, IconWorld } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { AvatarMark } from '../shared/ui/AvatarMark'
import { EmptyState } from '../shared/ui/EmptyState'
import { MeetingList } from '../features/manage-meeting-request/MeetingList'
import { PageHeader } from '../shared/ui/PageHeader'
import { SlotPicker } from '../features/request-meeting/SlotPicker'
import { Surface } from '../shared/ui/Surface'
import { ContactLinks } from '../shared/ui/ContactLinks'

export function MyMentor() {
  const { currentMentor } = useAssignmentGateway()
  const { meetings } = useMeetingGateway()
  const { user } = useUserGateway()
  const navigate = useNavigate()
  if (!currentMentor) return <Stack gap="xl"><PageHeader title="Мой ментор" /><EmptyState /></Stack>
  const mentorMeetings = meetings.filter((meeting) => meeting.studentId === user?.id && meeting.mentorId === currentMentor.id)
  const upcoming = mentorMeetings.filter((meeting) => ['pending', 'confirmed'].includes(meeting.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const history = mentorMeetings.filter((meeting) => ['completed', 'cancelled'].includes(meeting.status))

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Активное назначение" title="Мой ментор" description="Профиль наставника, встречи и совместный рабочий контекст." />
      <Surface><div className="profile-header-grid"><Group gap="xl" wrap="nowrap"><AvatarMark initials={currentMentor.initials} color={currentMentor.avatarColor} size={82} /><div><Text className="eyebrow">{currentMentor.specialization}</Text><Title order={2} mt={5}>{currentMentor.name}</Title><Text c="dimmed" size="sm">{currentMentor.position} · {currentMentor.company}</Text></div></Group></div><Group gap="xl" mt="xl"><Group gap={7}><IconWorld size={17} /><Text size="sm">{currentMentor.timezone}</Text></Group></Group></Surface>
      <Surface><Title order={3} mb="md">Связаться с наставником</Title><ContactLinks email={currentMentor.email} telegramUsername={currentMentor.telegramUsername} phoneNumber={currentMentor.phoneNumber} /><Text size="sm" c="dimmed" mt="md">Детали обсудите напрямую; запросы и статусы встреч остаются в приложении.</Text></Surface>
      <Grid gutter="lg"><Grid.Col span={{ base: 12, md: 8 }}><Surface><Title order={2}>О наставнике</Title><Text c="dimmed" mt="md" className="readable-text">{currentMentor.about}</Text><Group mt="lg">{currentMentor.skills.map((skill) => <Badge key={skill} variant="light">{skill}</Badge>)}</Group></Surface></Grid.Col><Grid.Col span={{ base: 12, md: 4 }}><Surface><Text className="eyebrow">Следующая встреча</Text><Title order={3} mt="sm">{upcoming[0] ? `${upcoming[0].date} · ${upcoming[0].time}` : 'Пока не назначена'}</Title><Text size="sm" c="dimmed" mt={5}>{upcoming[0] ? `${upcoming[0].duration} минут · ${upcoming[0].status === 'pending' ? 'Ожидает подтверждения' : 'Ссылка в карточке встречи'}` : 'Выберите свободный слот'}</Text><Button mt="lg" variant="light" leftSection={<IconExternalLink size={16} />} onClick={() => navigate('/student/meetings')}>Открыть встречи</Button></Surface></Grid.Col></Grid>
      <div id="slots"><Group justify="space-between" mb="md"><div><Title order={2}>Свободное время</Title><Text size="sm" c="dimmed" mt={4}>Выберите удобный интервал и отправьте заявку</Text></div><IconClock size={21} /></Group><SlotPicker mentor={currentMentor} /></div>
      <div><Group justify="space-between" mb="md"><Title order={2}>Предстоящие встречи</Title><IconCalendarEvent size={21} /></Group><MeetingList meetings={upcoming} /></div>
      <div><Title order={2} mb="md">История встреч</Title><MeetingList meetings={history} /></div>
    </Stack>
  )
}
