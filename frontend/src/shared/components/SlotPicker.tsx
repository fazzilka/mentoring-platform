import { Button, Group, Modal, Radio, Stack, Text } from '@mantine/core'
import { IconCalendarEvent, IconClock } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatformState } from '../../features/platform/usePlatformState'
import type { Mentor, TimeSlot } from '../types'
import { EmptyContent } from './EmptyContent'
import { Surface } from './Surface'

export function SlotPicker({ mentor }: { mentor: Mentor }) {
  const { claimedSlotIds, requestMeeting } = usePlatformState()
  const [selected, setSelected] = useState<TimeSlot | null>(null)
  const navigate = useNavigate()
  const slots = mentor.availableSlots.filter((slot) => !claimedSlotIds.includes(slot.id))

  if (slots.length === 0) {
    return <EmptyContent title="Свободных слотов пока нет" description="Новые интервалы появятся здесь, когда наставник обновит расписание." />
  }

  return (
    <>
      <Stack gap="sm">
        {slots.map((slot) => (
          <button className="slot-button" key={slot.id} onClick={() => setSelected(slot)}>
            <div><Text className="eyebrow">{slot.dateLabel}</Text><Text fw={650} mt={4}>{slot.time}</Text></div>
            <Group gap={6}><IconClock size={16} /><Text size="sm" c="dimmed">{slot.duration} минут</Text></Group>
            <span>Выбрать</span>
          </button>
        ))}
      </Stack>
      <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Запросить встречу" centered classNames={{ content: 'modal-surface' }}>
        {selected && (
          <Stack gap="lg">
            <Surface>
              <Stack gap="sm">
                <Group justify="space-between"><Text c="dimmed" size="sm">Наставник</Text><Text fw={650}>{mentor.name}</Text></Group>
                <Group justify="space-between"><Text c="dimmed" size="sm">Дата</Text><Text fw={650}>{selected.date}</Text></Group>
                <Group justify="space-between"><Text c="dimmed" size="sm">Время</Text><Text fw={650}>{selected.time}</Text></Group>
                <Group justify="space-between"><Text c="dimmed" size="sm">Продолжительность</Text><Text fw={650}>{selected.duration} минут</Text></Group>
              </Stack>
            </Surface>
            <Text size="sm" c="dimmed">Наставник получит заявку и подтвердит встречу. Ссылка на Телемост появится после подтверждения.</Text>
            <Radio checked readOnly label={`Время показано в вашем часовом поясе (${Intl.DateTimeFormat().resolvedOptions().timeZone})`} />
            <Group justify="flex-end"><Button variant="default" onClick={() => setSelected(null)}>Отмена</Button><Button leftSection={<IconCalendarEvent size={17} />} onClick={async () => { if (await requestMeeting(mentor, selected)) { setSelected(null); navigate('/student/meetings') } }}>Отправить заявку</Button></Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}
