import { useMeetingGateway } from '../entities/meeting/model'
import { useUserGateway } from '../entities/user/model'
import { useStudentGateway } from '../entities/student/model'
import { useAvailabilityGateway } from '../entities/availability/model'
import { Button, Group, SegmentedControl, Select, Stack, TextInput } from '@mantine/core'
import { useMemo, useState } from 'react'
import { MeetingList } from '../features/manage-meeting-request/MeetingList'
import { mentorMeetingSchema } from '../features/manage-meeting-request/schema'
import { formErrors } from '../shared/lib/validation'
import { Dialog } from '../shared/ui/Dialog'
import { PageHeader } from '../shared/ui/PageHeader'

export function MentorMeetings() {
  const { meetings, createMentorMeeting } = useMeetingGateway()
  const { user, profile } = useUserGateway()
  const { students } = useStudentGateway()
  const { availability } = useAvailabilityGateway()
  const [tab, setTab] = useState('requests')
  const [opened, setOpened] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [attempted, setAttempted] = useState(false)
  const errors = formErrors(mentorMeetingSchema, { studentId, slotId, meetingUrl })
  const freeSlots = availability.filter(slot => slot.state === 'free' && new Date(slot.startsAt) > new Date())
  const ownMeetings = meetings.filter((meeting) => meeting.mentorId === user?.id)
  const filtered = useMemo(() => ownMeetings.filter((meeting) => tab === 'requests' ? meeting.status === 'pending' : tab === 'upcoming' ? meeting.status === 'confirmed' : ['completed', 'cancelled'].includes(meeting.status)), [ownMeetings, tab])
  const create = async () => {
    setAttempted(true)
    const result = mentorMeetingSchema.safeParse({ studentId, slotId, meetingUrl })
    if (result.success && await createMentorMeeting(result.data.studentId, result.data.slotId, result.data.meetingUrl)) {
      setOpened(false); setTab('upcoming'); setAttempted(false); setStudentId(''); setSlotId('')
    }
  }
  return <Stack gap="xl"><PageHeader eyebrow="Расписание" title="Встречи" description="Подтверждайте заявки или назначайте встречи своим ученикам." action={<Button onClick={() => { setMeetingUrl(profile.meetingUrl); setOpened(true) }}>Назначить встречу</Button>} /><SegmentedControl value={tab} onChange={setTab} data={[{ label: 'Заявки', value: 'requests' }, { label: 'Предстоящие', value: 'upcoming' }, { label: 'Прошедшие', value: 'past' }]} /><MeetingList meetings={filtered} audience="mentor" />
    <Dialog opened={opened} onClose={() => setOpened(false)} title="Назначить встречу" centered><Stack gap="md"><Select label="Ученик" data={students.map(student => ({ value: student.id, label: student.name }))} value={studentId || null} onChange={value => setStudentId(value ?? '')} error={attempted ? errors.studentId : undefined} placeholder="Выберите закреплённого ученика" /><Select label="Свободное время" data={freeSlots.map(slot => ({ value: slot.id, label: `${slot.dateLabel}, ${slot.time} · ${slot.duration} минут` }))} value={slotId || null} onChange={value => setSlotId(value ?? '')} error={attempted ? errors.slotId : undefined} placeholder="Сначала добавьте слот в разделе «Свободное время»" /><TextInput label="Ссылка на встречу" placeholder="https://meet.google.com/..." value={meetingUrl} onChange={event => setMeetingUrl(event.currentTarget.value)} error={attempted ? errors.meetingUrl : undefined} /><Group justify="flex-end"><Button variant="default" onClick={() => setOpened(false)}>Отмена</Button><Button onClick={() => { void create() }}>Назначить</Button></Group></Stack></Dialog>
  </Stack>
}
