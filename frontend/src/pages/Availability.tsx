import { ActionIcon, Badge, Button, Group, Modal, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconCalendarPlus, IconClock, IconLock, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { EmptyContent } from '../shared/components/EmptyContent'
import { PageHeader } from '../shared/components/PageHeader'
import { Surface } from '../shared/components/Surface'
import { usePlatformState } from '../features/platform/usePlatformState'

const slotLabels = { free: 'Свободно', pending: 'Ожидает подтверждения', booked: 'Занято' }
const slotColors = { free: 'teal', pending: 'yellow', booked: 'gray' }

export function Availability() {
  const { availability, addAvailability, removeAvailability } = usePlatformState()
  const [opened, { open, close }] = useDisclosure(false)
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [time, setTime] = useState('19:00')
  const [duration, setDuration] = useState('60')

  const submit = async () => {
    if (await addAvailability({ date, time, duration: Number(duration) as 60 | 75 | 90 })) close()
  }

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Расписание" title="Свободное время" description="Добавляйте интервалы, в которые ученики смогут отправить заявку." action={<Button leftSection={<IconCalendarPlus size={17} />} onClick={open}>Добавить время</Button>} />
      {availability.length > 0 ? <Stack gap="sm">{availability.map((slot) => <Surface key={slot.id} interactive={slot.state === 'free'}><div className="availability-item"><Group gap="md"><div className="icon-tile"><IconClock size={19} /></div><div><Text fw={650}>{slot.dateLabel}, {slot.time}</Text><Text size="sm" c="dimmed">{slot.duration} минут</Text></div></Group><Badge variant="light" color={slotColors[slot.state]}>{slotLabels[slot.state]}</Badge>{slot.state === 'free' ? <Tooltip label="Удалить свободный слот"><ActionIcon color="red" variant="subtle" aria-label={`Удалить слот ${slot.dateLabel} ${slot.time}`} onClick={() => removeAvailability(slot.id)}><IconTrash size={18} /></ActionIcon></Tooltip> : <Tooltip label="Этот слот нельзя удалить"><ActionIcon color="gray" variant="subtle" disabled aria-label="Слот занят"><IconLock size={17} /></ActionIcon></Tooltip>}</div></Surface>)}</Stack> : <EmptyContent title="Свободного времени нет" description="Добавьте первый интервал, чтобы ученики могли отправлять заявки." action={{ label: 'Добавить время', onClick: open }} />}
      <Modal opened={opened} onClose={close} title="Новое свободное время" centered>
        <Stack gap="md"><TextInput type="date" label="Дата" value={date} onChange={(event) => setDate(event.currentTarget.value)} /><TextInput type="time" label="Время" value={time} onChange={(event) => setTime(event.currentTarget.value)} /><Select label="Длительность" value={duration} onChange={(value) => setDuration(value ?? '60')} data={[{ value: '60', label: '60 минут' }, { value: '75', label: '75 минут' }, { value: '90', label: '90 минут' }]} /><Group justify="flex-end"><Button variant="default" onClick={close}>Отмена</Button><Button onClick={submit}>Добавить</Button></Group></Stack>
      </Modal>
    </Stack>
  )
}
