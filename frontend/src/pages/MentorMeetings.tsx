import { useMeetingGateway } from '../entities/meeting/model'
import { useUserGateway } from '../entities/user/model'
import { SegmentedControl, Stack } from '@mantine/core'
import { useMemo, useState } from 'react'
import { MeetingList } from '../features/manage-meeting-request/MeetingList'
import { PageHeader } from '../shared/ui/PageHeader'

export function MentorMeetings() {
  const { meetings } = useMeetingGateway()
  const { user } = useUserGateway()
  const [tab, setTab] = useState('requests')
  const ownMeetings = meetings.filter((meeting) => meeting.mentorId === user?.id)
  const filtered = useMemo(() => ownMeetings.filter((meeting) => tab === 'requests' ? meeting.status === 'pending' : tab === 'upcoming' ? meeting.status === 'confirmed' : ['completed', 'cancelled'].includes(meeting.status)), [ownMeetings, tab])
  return <Stack gap="xl"><PageHeader eyebrow="Расписание" title="Встречи" description="Подтверждайте заявки и сохраняйте контекст завершённых встреч." /><SegmentedControl value={tab} onChange={setTab} data={[{ label: 'Заявки', value: 'requests' }, { label: 'Предстоящие', value: 'upcoming' }, { label: 'Прошедшие', value: 'past' }]} /><MeetingList meetings={filtered} audience="mentor" /></Stack>
}
