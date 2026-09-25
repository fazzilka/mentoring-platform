import { Alert, Button, SegmentedControl, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { IconCheck, IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyContent } from '../shared/components/EmptyContent'
import { MentorCard } from '../shared/components/MentorCard'
import { PageHeader } from '../shared/components/PageHeader'
import { usePlatformState } from '../features/platform/usePlatformState'

export function MentorCatalog() {
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('Все')
  const { scenario, mentors } = usePlatformState()
  const navigate = useNavigate()
  const filtered = useMemo(() => mentors.filter((mentor) => {
    const haystack = `${mentor.name} ${mentor.position} ${mentor.company} ${mentor.skills.join(' ')} ${mentor.specialization}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase()) && (specialization === 'Все' || mentor.specialization === specialization)
  }), [mentors, search, specialization])

  if (scenario === 'active') {
    return <Stack gap="xl"><PageHeader eyebrow="Каталог" title="Наставники" /><Alert icon={<IconCheck size={20} />} title="У вас уже есть активный ментор" color="indigo">Одновременно можно работать только с одним наставником. Самостоятельная смена ментора не предусмотрена.</Alert><Button w="fit-content" onClick={() => navigate('/student/my-mentor')}>Открыть «Мой ментор»</Button></Stack>
  }

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Каталог" title="Наставники" description="Найдите специалиста, который поможет двигаться к вашей цели." />
      <div className="filter-bar">
        <TextInput leftSection={<IconSearch size={18} />} placeholder="Имя, компания или технология" value={search} onChange={(event) => setSearch(event.currentTarget.value)} className="search-input" aria-label="Поиск наставника" />
        <SegmentedControl value={specialization} onChange={setSpecialization} data={['Все', 'Backend', 'Frontend', 'ML', 'DevOps']} />
      </div>
      <Text size="sm" c="dimmed">{filtered.length > 0 ? `Найдено: ${filtered.length}` : 'Нет совпадений'}</Text>
      {filtered.length > 0 ? <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="lg">{filtered.map((mentor) => <MentorCard key={mentor.id} mentor={mentor} />)}</SimpleGrid> : <EmptyContent icon={<IconSearch size={24} />} title="Наставники не найдены" description="Попробуйте другой запрос или сбросьте фильтр направления." action={{ label: 'Сбросить фильтры', onClick: () => { setSearch(''); setSpecialization('Все') } }} />}
    </Stack>
  )
}
