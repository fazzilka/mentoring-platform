import { Badge, Button, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvatarMark } from '../shared/components/AvatarMark'
import { EmptyContent } from '../shared/components/EmptyContent'
import { PageHeader } from '../shared/components/PageHeader'
import { Surface } from '../shared/components/Surface'
import { usePlatformState } from '../features/platform/usePlatformState'

export function MyStudents() {
  const { students } = usePlatformState()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const filtered = useMemo(() => students.filter((student) => `${student.name} ${student.direction} ${student.level} ${student.skills.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [students, search])

  return (
    <Stack gap="xl">
      <PageHeader eyebrow={`${students.length} активных учеников`} title="Мои ученики" description="Цели, прогресс и ближайшие точки контакта." />
      <TextInput leftSection={<IconSearch size={18} />} placeholder="Имя, направление или технология" value={search} onChange={(event) => setSearch(event.currentTarget.value)} className="search-input" aria-label="Поиск ученика" />
      {filtered.length > 0 ? <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">{filtered.map((student) => (
        <Surface key={student.id} interactive><Stack gap="lg"><Group justify="space-between" align="flex-start"><Group wrap="nowrap"><AvatarMark initials={student.initials} color="#e8e4db" /><div><Title order={3}>{student.name}</Title><Text size="sm" c="dimmed">{student.direction} · {student.level}</Text></div></Group><Badge variant="light" color="teal">Активен</Badge></Group><Group gap={6}>{student.skills.map((skill) => <Badge key={skill} variant="outline" color="gray">{skill}</Badge>)}</Group><div><Text size="xs" c="dimmed">Цель</Text><Text size="sm" fw={600} mt={4}>{student.goal}</Text></div><Button variant="light" onClick={() => navigate(`/mentor/students/${student.id}`)}>Открыть профиль</Button></Stack></Surface>
      ))}</SimpleGrid> : <EmptyContent icon={<IconSearch size={24} />} title="Ученики не найдены" description="Измените поисковый запрос. Здесь отображаются только закреплённые за вами ученики." action={{ label: 'Очистить поиск', onClick: () => setSearch('') }} />}
    </Stack>
  )
}
