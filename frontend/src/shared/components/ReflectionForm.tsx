import { Button, Group, Modal, Stack, Textarea } from '@mantine/core'
import { useEffect, useState } from 'react'
import { usePlatformState } from '../../features/platform/usePlatformState'
import type { MeetingAudience } from '../types'

export function ReflectionForm({ meetingId, author, opened, onClose }: {
  meetingId: string
  author: MeetingAudience
  opened: boolean
  onClose: () => void
}) {
  const { reflections, saveReflection } = usePlatformState()
  const existing = reflections.find((item) => item.meetingId === meetingId && item.author === author)
  const [summary, setSummary] = useState(existing?.summary ?? '')
  const [nextStep, setNextStep] = useState(existing?.nextStep ?? '')

  useEffect(() => {
    setSummary(existing?.summary ?? '')
    setNextStep(existing?.nextStep ?? '')
  }, [existing])

  const submit = async () => {
    if (!summary.trim()) return
    if (await saveReflection(meetingId, author, summary.trim(), nextStep.trim() || undefined)) onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Приватная заметка о встрече" centered>
      <Stack gap="md">
        <Textarea label="Что было важным" value={summary} onChange={(event) => setSummary(event.currentTarget.value)} minRows={4} required />
        <Textarea label="Следующий шаг" value={nextStep} onChange={(event) => setNextStep(event.currentTarget.value)} minRows={2} />
        <Group justify="flex-end"><Button variant="default" onClick={onClose}>Отмена</Button><Button onClick={submit} disabled={!summary.trim() || Boolean(existing)}>Сохранить заметку</Button></Group>
      </Stack>
    </Modal>
  )
}
