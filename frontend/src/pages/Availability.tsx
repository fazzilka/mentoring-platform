import { Dialog } from '../shared/ui/Dialog'
import { availabilitySchema } from '../features/manage-availability/schema'
import { formErrors } from '../shared/lib/validation'
import { useAvailabilityGateway } from '../entities/availability/model'
import { useManageAvailability } from '../features/manage-availability/model'
import { ActionIcon, Badge, Button, Group, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconCalendarPlus, IconClock, IconLock, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { EmptyContent } from '../shared/ui/EmptyContent'
import { PageHeader } from '../shared/ui/PageHeader'
import { Surface } from '../shared/ui/Surface'

const slotLabels = { free: 'Свободно', pending: 'Ожидает подтверждения', booked: 'Занято' }
const slotColors = { free: 'teal', pending: 'yellow', booked: 'gray' }

export function Availability() {
  const { availability } = useAvailabilityGateway()
  const { addAvailability, removeAvailability } = useManageAvailability()
  const [opened, { open, close }] = useDisclosure(false)
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [time, setTime] = useState('19:00')
  const [duration, setDuration] = useState('60')

  const errors = formErrors(availabilitySchema, { date, time, duration: Number(duration) })
  const submit = async () => {
    const result = availabilitySchema.safeParse({ date, time, duration: Number(duration) })
    if (result.success && await addAvailability(result.data)) close()
  }

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Расписание" title="Свободное время" description="Добавляйте интервалы, в которые ученики смогут отправить заявку." action={<Button leftSection={<IconCalendarPlus size={17} />} onClick={open}>Добавить время</Button>} />
      {availability.length > 0 ? <Stack gap="sm">{availability.map((slot) => <Surface key={slot.id} interactive={slot.state === 'free'}><div className="availability-item"><Group gap="md"><div className="icon-tile"><IconClock size={19} /></div><div><Text fw={650}>{slot.dateLabel}, {slot.time}</Text><Text size="sm" c="dimmed">{slot.duration} минут</Text></div></Group><Badge variant="light" color={slotColors[slot.state]}>{slotLabels[slot.state]}</Badge>{slot.state === 'free' ? <Tooltip label="Удалить свободный слот"><ActionIcon color="red" variant="subtle" aria-label={`Удалить слот ${slot.dateLabel} ${slot.time}`} onClick={() => removeAvailability(slot.id)}><IconTrash size={18} /></ActionIcon></Tooltip> : <Tooltip label="Этот слот нельзя удалить"><ActionIcon color="gray" variant="subtle" disabled aria-label="Слот занят"><IconLock size={17} /></ActionIcon></Tooltip>}</div></Surface>)}</Stack> : <EmptyContent title="Свободного времени нет" description="Добавьте первый интервал, чтобы ученики могли отправлять заявки." action={{ label: 'Добавить время', onClick: open }} />}
      <Dialog opened={opened} onClose={close} title="Новое свободное время" centered>
        <Stack gap="md"><TextInput type="date" label="Дата" error={errors.date} value={date} onChange={(event) => setDate(event.currentTarget.value)} /><TextInput type="time" label="Время" error={errors.time} value={time} onChange={(event) => setTime(event.currentTarget.value)} /><Select label="Длительность" error={errors.duration} value={duration} onChange={(value) => setDuration(value ?? '60')} data={[{ value: '60', label: '60 минут' }, { value: '75', label: '75 минут' }, { value: '90', label: '90 минут' }]} /><Group justify="flex-end"><Button variant="default" onClick={close}>Отмена</Button><Button onClick={submit}>Добавить</Button></Group></Stack>
      </Dialog>
    </Stack>
  )
}
