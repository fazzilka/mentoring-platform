import { Dialog } from '../../shared/ui/Dialog'
import { reflectionSchema } from './schema'
import { formErrors } from '../../shared/lib/validation'
import { useReflectionGateway } from '../../entities/reflection/model'
import { useWriteReflection } from './model'
import { Button, Group, Stack, Textarea } from '@mantine/core'
import { useEffect, useState } from 'react'
import type { MeetingAudience } from '../../entities'

export function ReflectionForm({ meetingId, author, opened, onClose }: {
  meetingId: string
  author: MeetingAudience
  opened: boolean
  onClose: () => void
}) {
  const { reflections } = useReflectionGateway()
  const { saveReflection } = useWriteReflection()
  const existing = reflections.find((item) => item.meetingId === meetingId && item.author === author)
  const [summary, setSummary] = useState(existing?.summary ?? '')
  const [nextStep, setNextStep] = useState(existing?.nextStep ?? '')

  useEffect(() => {
    setSummary(existing?.summary ?? '')
    setNextStep(existing?.nextStep ?? '')
  }, [existing])

  const errors = formErrors(reflectionSchema, { summary, nextStep })
  const submit = async () => {
    if (!summary.trim()) return
    if (await saveReflection(meetingId, author, summary.trim(), nextStep.trim() || undefined)) onClose()
  }

  return (
    <Dialog opened={opened} onClose={onClose} title="Приватная заметка о встрече" centered>
      <Stack gap="md">
        <Textarea label="Что было важным" error={summary ? errors.summary : undefined} value={summary} onChange={(event) => setSummary(event.currentTarget.value)} minRows={4} required />
        <Textarea label="Следующий шаг" error={nextStep ? errors.nextStep : undefined} value={nextStep} onChange={(event) => setNextStep(event.currentTarget.value)} minRows={2} />
        <Group justify="flex-end"><Button variant="default" onClick={onClose}>Отмена</Button><Button onClick={submit} disabled={!summary.trim()}>Сохранить заметку</Button></Group>
      </Stack>
    </Dialog>
  )
}
