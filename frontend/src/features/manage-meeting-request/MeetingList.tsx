import { Dialog } from '../../shared/ui/Dialog'
import { useCancelMeeting } from '../cancel-meeting/model'
import { useManageMeetingRequest } from './model'
import { useReflectionGateway } from '../../entities/reflection/model'
import { Badge, Button, Group, Stack, Text } from '@mantine/core'
import { IconCalendarEvent, IconClock, IconExternalLink, IconNotes, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import type { Meeting, MeetingAudience, MeetingStatus } from '../../entities'
import { EmptyContent } from '../../shared/ui/EmptyContent'
import { ReflectionForm } from '../write-reflection/ReflectionForm'
import { Surface } from '../../shared/ui/Surface'

const statusLabels: Record<MeetingStatus, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

const statusColors: Record<MeetingStatus, string> = {
  pending: 'yellow',
  confirmed: 'indigo',
  completed: 'teal',
  cancelled: 'gray',
}

export function MeetingList({ meetings, audience = 'student', compact = false }: {
  meetings: Meeting[]
  audience?: MeetingAudience
  compact?: boolean
}) {
  const { cancelMeeting } = useCancelMeeting()
  const { updateMeetingStatus } = useManageMeetingRequest()
  const { reflections } = useReflectionGateway()
  const [confirm, setConfirm] = useState<{ meeting: Meeting; action: 'cancel' | 'reject' } | null>(null)
  const [reflectionMeeting, setReflectionMeeting] = useState<string | null>(null)
  const visibleMeetings = compact ? meetings.slice(0, 3) : meetings

  if (visibleMeetings.length === 0) {
    return <EmptyContent title="Здесь пока ничего нет" description="Когда появятся подходящие встречи, они будут собраны в этом разделе." />
  }

  const personLabel = audience === 'mentor' ? 'Ученик' : 'Наставник'
  const personName = (meeting: Meeting) => audience === 'mentor' ? meeting.studentName : meeting.mentorName

  return (
    <>
      <Stack gap="sm">
        {visibleMeetings.map((meeting) => {
          const hasReflection = reflections.some((item) => item.meetingId === meeting.id && item.author === audience)
          return (
            <Surface key={meeting.id} interactive>
              <div className={`meeting-row${compact ? ' compact' : ''}`}>
                <Group gap="md" wrap="nowrap">
                  <div className="icon-tile"><IconCalendarEvent size={20} /></div>
                  <div>
                    <Text fw={650}>{meeting.title}</Text>
                    <Text size="sm" c="dimmed">{personLabel}: {personName(meeting)}</Text>
                  </div>
                </Group>
                <div className="meeting-facts">
                  <div><Text size="xs" c="dimmed">Дата и время</Text><Text size="sm" fw={550}>{meeting.date}, {meeting.time}</Text></div>
                  <Group gap={6}><IconClock size={16} /><Text size="sm">{meeting.duration} мин</Text></Group>
                  <Badge variant="light" color={statusColors[meeting.status]}>{statusLabels[meeting.status]}</Badge>
                </div>
                <Group gap="xs" className="meeting-actions">
                  {meeting.status === 'confirmed' && meeting.meetingUrl && <Button component="a" href={meeting.meetingUrl} target="_blank" rel="noreferrer" size="xs" variant="light" rightSection={<IconExternalLink size={14} />}>Открыть Телемост</Button>}
                  {audience === 'student' && ['pending', 'confirmed'].includes(meeting.status) && <Button size="xs" variant="subtle" color="red" leftSection={<IconX size={14} />} onClick={() => setConfirm({ meeting, action: 'cancel' })}>Отменить</Button>}
                  {audience === 'mentor' && meeting.status === 'pending' && <><Button size="xs" onClick={() => updateMeetingStatus(meeting.id, 'confirmed')}>Подтвердить</Button><Button size="xs" variant="subtle" color="red" onClick={() => setConfirm({ meeting, action: 'reject' })}>Отклонить</Button></>}
                  {audience === 'mentor' && meeting.status === 'confirmed' && new Date(meeting.startsAt).getTime() + meeting.duration * 60_000 <= Date.now() && <Button size="xs" variant="light" onClick={() => updateMeetingStatus(meeting.id, 'completed')}>Завершить</Button>}
                  {meeting.status === 'completed' && <Button size="xs" variant="subtle" leftSection={<IconNotes size={15} />} onClick={() => setReflectionMeeting(meeting.id)}>{hasReflection ? 'Заметка сохранена' : 'Оставить заметку'}</Button>}
                </Group>
              </div>
            </Surface>
          )
        })}
      </Stack>
      <Dialog opened={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.action === 'cancel' ? 'Отменить встречу?' : 'Отклонить заявку?'} centered>
        {confirm && <Stack><Text size="sm">{confirm.meeting.date}, {confirm.meeting.time} · {confirm.meeting.duration} минут. Это действие сохранится в истории.</Text><Group justify="flex-end"><Button variant="default" onClick={() => setConfirm(null)}>Вернуться</Button><Button color="red" onClick={() => { if (confirm.action === 'cancel') cancelMeeting(confirm.meeting.id); else updateMeetingStatus(confirm.meeting.id, 'cancelled'); setConfirm(null) }}>{confirm.action === 'cancel' ? 'Отменить встречу' : 'Отклонить'}</Button></Group></Stack>}
      </Dialog>
      {reflectionMeeting && <ReflectionForm meetingId={reflectionMeeting} author={audience} opened onClose={() => setReflectionMeeting(null)} />}
    </>
  )
}
