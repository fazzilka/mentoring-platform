import { useMeetingGateway } from '../entities/meeting/model'
import { useReflectionGateway } from '../entities/reflection/model'
import { useStudentGateway } from '../entities/student/model'
import { Badge, Button, Grid, Group, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft, IconCalendarEvent, IconNotes } from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AvatarMark } from '../shared/ui/AvatarMark'
import { MeetingList } from '../features/manage-meeting-request/MeetingList'
import { PageHeader } from '../shared/ui/PageHeader'
import { Surface } from '../shared/ui/Surface'
import { ContactLinks } from '../shared/ui/ContactLinks'

export function StudentDetails() {
  const { studentId } = useParams()
  const { meetings } = useMeetingGateway()
  const { reflections } = useReflectionGateway()
  const { students } = useStudentGateway()
  const student = students.find((item) => item.id === studentId)
  const navigate = useNavigate()
  if (!student) return <Stack><PageHeader title="Ученик не найден" /><Button w="fit-content" onClick={() => navigate('/mentor/students')}>К списку учеников</Button></Stack>
  const studentMeetings = meetings.filter((meeting) => meeting.studentId === student.id)
  const upcoming = studentMeetings.filter((meeting) => ['pending', 'confirmed'].includes(meeting.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const history = studentMeetings.filter((meeting) => meeting.status === 'completed')
  const notes = reflections.filter((reflection) => history.some((meeting) => meeting.id === reflection.meetingId))

  return (
    <Stack gap="xl">
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={17} />} w="fit-content" onClick={() => navigate('/mentor/students')}>Назад к ученикам</Button>
      <PageHeader eyebrow="Профиль ученика" title={student.name} description={`${student.direction} · ${student.level}`} />
      <Grid gutter="lg"><Grid.Col span={{ base: 12, md: 7 }}><Surface><Group gap="lg" wrap="nowrap"><AvatarMark initials={student.initials} color="#e8e4db" size={72} /><div><Title order={2}>{student.name}</Title><Text c="dimmed">{student.about}</Text></div></Group><div className="profile-summary-grid"><div><Text size="xs" c="dimmed">Цель обучения</Text><Text size="sm" fw={600} mt={5}>{student.goal}</Text></div><div><Text size="xs" c="dimmed">Технологии</Text><Group gap={6} mt={7}>{student.skills.map((skill) => <Badge key={skill} variant="light">{skill}</Badge>)}</Group></div></div></Surface></Grid.Col><Grid.Col span={{ base: 12, md: 5 }}><Surface><Text className="eyebrow">Следующая встреча</Text><Title order={3} mt="sm">{upcoming[0] ? `${upcoming[0].date}, ${upcoming[0].time}` : 'Не назначена'}</Title><Text size="sm" c="dimmed" mt={5}>{upcoming[0]?.title ?? 'Добавьте свободное время для записи'}</Text><Button mt="lg" variant="light" leftSection={<IconCalendarEvent size={16} />} onClick={() => navigate('/mentor/meetings')}>Открыть расписание</Button></Surface></Grid.Col></Grid>
      <Surface><Title order={3} mb="md">Связаться с учеником</Title><ContactLinks email={student.email} telegramUsername={student.telegramUsername} phoneNumber={student.phoneNumber} /></Surface>
      <section><Title order={2} mb="md">История встреч</Title><MeetingList meetings={history} audience="mentor" /></section>
      <section><Group mb="md"><IconNotes size={20} /><Title order={2}>Заметки и reflections</Title></Group><Stack gap="sm">{notes.map((note) => <Surface key={note.id}><Text className="eyebrow">{note.date} · {note.author === 'student' ? 'Ученик' : 'Моя заметка'}</Text><Text mt="sm">{note.summary}</Text>{note.nextStep && <Text size="sm" c="dimmed" mt={8}>К следующей встрече: {note.nextStep}</Text>}</Surface>)}</Stack></section>
    </Stack>
  )
}
