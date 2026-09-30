import { useUserGateway } from '../entities/user/model'
import { useAssignmentGateway } from '../entities/assignment/model'
import { useMeetingGateway } from '../entities/meeting/model'
import { useReflectionGateway } from '../entities/reflection/model'
import { Alert, Badge, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconAlertCircle, IconArrowRight, IconCalendarEvent, IconNotes } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { AvatarMark } from '../shared/ui/AvatarMark'
import { EmptyState } from '../shared/ui/EmptyState'
import { MeetingList } from '../features/manage-meeting-request/MeetingList'
import { PageHeader } from '../shared/ui/PageHeader'
import { Surface } from '../shared/ui/Surface'

function StudentProfileCard() {
  const { profile } = useUserGateway()
  return (
    <Surface>
      <Group justify="space-between" align="flex-start" gap="xl" wrap="wrap">
        <div><Text className="eyebrow">Ваш профиль</Text><Title order={2} mt={6}>{profile.studentDirection}</Title><Text c="dimmed" mt={5}>{profile.studentLevel} · цель на 12 месяцев</Text></div>
        <Badge variant="light" size="lg">{profile.studentLevel}</Badge>
      </Group>
      <div className="profile-summary-grid">
        <div><Text size="xs" c="dimmed">Цель</Text><Text size="sm" fw={600} mt={5}>{profile.studentGoal}</Text></div>
        <div><Text size="xs" c="dimmed">Технологии</Text><Group gap={6} mt={7}>{profile.studentTechnologies.split(', ').map((item) => <Badge key={item} variant="outline" color="gray">{item}</Badge>)}</Group></div>
      </div>
    </Surface>
  )
}

export function StudentDashboard() {
  const { scenario, currentMentor } = useAssignmentGateway()
  const { meetings } = useMeetingGateway()
  const { reflections } = useReflectionGateway()
  const { profile, user } = useUserGateway()
  const navigate = useNavigate()
  const upcoming = meetings.filter((meeting) => meeting.studentId === user?.id && ['pending', 'confirmed'].includes(meeting.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const latestReflection = reflections.find((item) => item.author === 'student')

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Обзор" title={`Здравствуйте, ${profile.firstName}`} description="Ваш следующий шаг, встречи и заметки — без лишнего шума." />
      {scenario === 'departed' && (
        <Alert icon={<IconAlertCircle size={20} />} title="Ваш ментор больше не ведёт учеников" color="orange" variant="light">
          <Group justify="space-between" align="center" gap="md" wrap="wrap"><Text size="sm">Вы можете выбрать нового наставника. История прошлых встреч и заметок сохранена.</Text><Button color="orange" variant="light" onClick={() => navigate('/student/mentors')}>Выбрать нового ментора</Button></Group>
        </Alert>
      )}
      {scenario === 'active' && currentMentor ? (
        <>
          <Surface>
            <div className="mentor-summary-grid">
              <Group gap="lg" wrap="nowrap"><AvatarMark initials={currentMentor.initials} color={currentMentor.avatarColor} size={64} /><div><Text className="eyebrow">Мой ментор · {currentMentor.specialization}</Text><Title order={2} mt={4}>{currentMentor.name}</Title><Text c="dimmed" size="sm">{currentMentor.position} · {currentMentor.company}</Text></div></Group>
              <Group gap="sm"><Button variant="default" onClick={() => navigate('/student/my-mentor')}>Открыть профиль</Button><Button rightSection={<IconArrowRight size={16} />} onClick={() => navigate('/student/my-mentor#slots')}>Запросить встречу</Button></Group>
            </div>
          </Surface>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Surface><Group justify="space-between"><Text size="sm" c="dimmed">Следующая встреча</Text><IconCalendarEvent size={18} /></Group><Title order={3} mt="md">{upcoming[0] ? `${upcoming[0].date}, ${upcoming[0].time}` : 'Пока не назначена'}</Title><Text size="sm" c="dimmed" mt={5}>{upcoming[0] ? `${upcoming[0].duration} минут · ${upcoming[0].status === 'pending' ? 'Ожидает подтверждения' : 'Ссылка в карточке встречи'}` : 'Выберите свободный слот наставника'}</Text></Surface>
            <Surface><Group justify="space-between"><Text size="sm" c="dimmed">Последняя заметка</Text><IconNotes size={18} /></Group><Text size="sm" fw={600} mt="md" lineClamp={2}>{latestReflection?.summary ?? 'Заметок пока нет'}</Text><Button variant="subtle" size="xs" mt={8} px={0} onClick={() => navigate('/student/notes')}>Открыть заметки</Button></Surface>
          </SimpleGrid>
          <div><Group justify="space-between" mb="md"><Title order={2}>Ближайшие встречи</Title><Button variant="subtle" onClick={() => navigate('/student/meetings')}>Все встречи</Button></Group><MeetingList meetings={upcoming} compact /></div>
        </>
      ) : (
        <><EmptyState /><StudentProfileCard /></>
      )}
    </Stack>
  )
}
