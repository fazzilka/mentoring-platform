import { Dialog } from '../shared/ui/Dialog'
import { useAssignmentGateway } from '../entities/assignment/model'
import { useAssignMentor } from '../features/assign-mentor/model'
import { useAvailabilityGateway } from '../entities/availability/model'
import { useMentorGateway } from '../entities/mentor/model'
import { Alert, Badge, Button, Grid, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconArrowLeft, IconBriefcase2, IconCheck, IconClock, IconWorld } from '@tabler/icons-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AvatarMark } from '../shared/ui/AvatarMark'
import { PageHeader } from '../shared/ui/PageHeader'

export function MentorDetails() {
  const { mentorId } = useParams()
  const { scenario, currentMentor } = useAssignmentGateway()
  const { selectMentor } = useAssignMentor()
  const { claimedSlotIds } = useAvailabilityGateway()
  const { mentors } = useMentorGateway()
  const mentor = mentors.find((item) => item.id === mentorId)
  const navigate = useNavigate()
  const [opened, { open, close }] = useDisclosure(false)
  if (!mentor) return <Stack gap="xl"><PageHeader title="Наставник не найден" /><Button w="fit-content" onClick={() => navigate('/student/mentors')}>Вернуться в каталог</Button></Stack>
  const isCurrent = currentMentor?.id === mentor.id

  return (
    <Stack gap="xl">
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={17} />} w="fit-content" onClick={() => navigate('/student/mentors')}>Назад к каталогу</Button>
      <section className="profile-hero">
        <div className="profile-header-grid">
          <Group gap="xl" align="flex-start" wrap="nowrap"><AvatarMark initials={mentor.initials} color={mentor.avatarColor} size={88} /><div><Group gap="sm"><Badge variant="light">{mentor.specialization}</Badge><Badge variant="dot" color={mentor.acceptingStudents ? 'teal' : 'gray'}>{mentor.acceptingStudents ? 'Принимает учеников' : 'Набор приостановлен'}</Badge></Group><Title mt="sm">{mentor.name}</Title><Text c="dimmed" mt={4}>{mentor.position} · {mentor.company}</Text></div></Group>
          {scenario !== 'active' && <Button size="md" disabled={!mentor.acceptingStudents} onClick={open}>{mentor.acceptingStudents ? 'Выбрать наставника' : 'Нет свободных мест'}</Button>}
          {isCurrent && <Badge size="lg" color="teal" variant="light" leftSection={<IconCheck size={15} />}>Ваш ментор</Badge>}
        </div>
        {!mentor.acceptingStudents && <Text size="sm" c="dimmed" mt="md">Оставьте профиль в закладках и проверьте наличие мест позже.</Text>}
      </section>
      <Grid gutter={{ base: 32, md: 56 }} className="profile-sections">
        <Grid.Col span={{ base: 12, md: 8 }}><Stack gap={40}><section><Title order={2}>О наставнике</Title><Text mt="md" c="dimmed" className="readable-text">{mentor.about}</Text></section><section><Title order={2}>Навыки</Title><Group mt="md">{mentor.skills.map((skill) => <Badge key={skill} size="lg" variant="light">{skill}</Badge>)}</Group></section></Stack></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}><aside className="profile-facts"><Stack gap="xl"><div><Text className="eyebrow">Опыт</Text><Group gap="sm" mt={8} align="flex-start" wrap="nowrap"><IconBriefcase2 size={18} /><Text size="sm">{mentor.experience}</Text></Group></div><div><Text className="eyebrow">Часовой пояс</Text><Group gap="sm" mt={8}><IconWorld size={18} /><Text size="sm">{mentor.timezone}</Text></Group></div></Stack></aside></Grid.Col>
      </Grid>
      <section className="profile-availability">
        <Group justify="space-between" mb="lg"><div><Title order={2}>Ближайшее свободное время</Title><Text size="sm" c="dimmed" mt={4}>После выбора наставника эти слоты можно будет запросить</Text></div><IconClock size={22} /></Group>
        {mentor.availableSlots.length > 0 ? <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>{mentor.availableSlots.map((slot) => <div className={`slot-preview${claimedSlotIds.includes(slot.id) ? ' claimed' : ''}`} key={slot.id}><Text className="eyebrow">{slot.dateLabel}</Text><Text fw={650} mt={5}>{slot.time}</Text><Text size="xs" c="dimmed" mt={3}>{slot.duration} минут</Text></div>)}</SimpleGrid> : <Alert color="gray">Наставник пока не добавил свободное время.</Alert>}
      </section>
      <Dialog opened={opened} onClose={close} title="Подтвердите выбор" centered>
        <Stack gap="lg"><Group><AvatarMark initials={mentor.initials} color={mentor.avatarColor} /><div><Text fw={650}>{mentor.name}</Text><Text size="sm" c="dimmed">{mentor.specialization} · {mentor.position}</Text></div></Group><Text size="sm">После подтверждения этот наставник станет вашим основным ментором. Самостоятельная смена активного ментора не предусмотрена.</Text><Group justify="flex-end"><Button variant="default" onClick={close}>Отмена</Button><Button onClick={async () => { if (await selectMentor(mentor)) { close(); navigate('/student/my-mentor') } }}>Выбрать наставника</Button></Group></Stack>
      </Dialog>
    </Stack>
  )
}
