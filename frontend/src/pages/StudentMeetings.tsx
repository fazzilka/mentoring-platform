import { Button, Group, SegmentedControl, Stack } from '@mantine/core'
import { IconCalendarPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MeetingList } from '../shared/components/MeetingList'
import { PageHeader } from '../shared/components/PageHeader'
import { usePlatformState } from '../features/platform/usePlatformState'

export function StudentMeetings() {
  const { scenario, meetings, user } = usePlatformState()
  const [tab, setTab] = useState('upcoming')
  const navigate = useNavigate()
  const ownMeetings = meetings.filter((meeting) => meeting.studentId === user?.id)
  const filtered = useMemo(() => ownMeetings.filter((meeting) => tab === 'upcoming' ? ['pending', 'confirmed'].includes(meeting.status) : tab === 'past' ? meeting.status === 'completed' : meeting.status === 'cancelled'), [ownMeetings, tab])

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Расписание" title="Встречи" description="Заявки, ближайшие встречи и сохранённая история." action={<Button disabled={scenario !== 'active'} leftSection={<IconCalendarPlus size={17} />} onClick={() => navigate('/student/my-mentor#slots')}>Запросить встречу</Button>} />
      <Group justify="space-between"><SegmentedControl value={tab} onChange={setTab} data={[{ label: 'Предстоящие', value: 'upcoming' }, { label: 'Прошедшие', value: 'past' }, { label: 'Отменённые', value: 'cancelled' }]} /></Group>
      <MeetingList meetings={filtered} />
    </Stack>
  )
}
