import { Badge, Button, Group, Stack, Text, Title } from '@mantine/core'
import { IconLock, IconNotes } from '@tabler/icons-react'
import { useState } from 'react'
import { ReflectionForm } from '../shared/components/ReflectionForm'
import { PageHeader } from '../shared/components/PageHeader'
import { Surface } from '../shared/components/Surface'
import { usePlatformState } from '../features/platform/usePlatformState'

export function NotesPage() {
  const { mode, meetings, reflections, user } = usePlatformState()
  const [meetingId, setMeetingId] = useState<string | null>(null)
  const completed = meetings.filter((meeting) => meeting.status === 'completed' && (mode === 'student' ? meeting.studentId === user?.id : meeting.mentorId === user?.id))

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Приватно" title="Заметки" description={mode === 'student' ? 'Ваши reflections после завершённых встреч.' : 'Ваши заметки и reflections учеников после завершённых встреч.'} />
      <Surface><Group gap="sm" wrap="nowrap"><IconLock size={18} /><Text size="sm" c="dimmed">Заметки не являются публичными отзывами и не используются для рейтинга.</Text></Group></Surface>
      {completed.map((meeting) => {
        const meetingNotes = reflections.filter((item) => item.meetingId === meeting.id && (mode === 'mentor' || item.author === 'student'))
        return <Surface key={meeting.id}><Group justify="space-between" align="flex-start" gap="lg" wrap="wrap"><div><Text className="eyebrow">{meeting.date} · {meeting.duration} минут</Text><Title order={3} mt={6}>{meeting.title}</Title><Text size="sm" c="dimmed" mt={4}>{mode === 'student' ? meeting.mentorName : meeting.studentName}</Text></div><Button variant="light" leftSection={<IconNotes size={16} />} disabled={meetingNotes.some((item) => item.author === mode)} onClick={() => setMeetingId(meeting.id)}>{meetingNotes.some((item) => item.author === mode) ? 'Моя заметка сохранена' : 'Добавить заметку'}</Button></Group><Stack gap="sm" mt="lg">{meetingNotes.map((note) => <div className="reflection-note" key={note.id}><Group justify="space-between"><Text size="xs" fw={700}>{note.author === 'student' ? 'Заметка ученика' : 'Моя заметка'}</Text><Badge variant="light" color="gray">{note.date}</Badge></Group><Text size="sm" mt={8}>{note.summary}</Text>{note.nextStep && <Text size="sm" c="dimmed" mt={5}>К следующей встрече: {note.nextStep}</Text>}</div>)}</Stack></Surface>
      })}
      {meetingId && <ReflectionForm meetingId={meetingId} author={mode} opened onClose={() => setMeetingId(null)} />}
    </Stack>
  )
}
