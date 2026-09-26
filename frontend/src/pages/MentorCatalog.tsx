import { useAssignmentGateway } from '../entities/assignment/model'
import { useMentorGateway } from '../entities/mentor/model'
import { Alert, Button, SimpleGrid, Stack, Text } from '@mantine/core'
import { IconCheck, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { SearchMentors, searchMentors } from '../features/search-mentors/SearchMentors'
import { FilterMentors, filterMentors, type MentorFilter } from '../features/filter-mentors/FilterMentors'
import { useNavigate } from 'react-router-dom'
import { EmptyContent } from '../shared/ui/EmptyContent'
import { MentorCard } from '../entities/mentor/ui/MentorCard'
import { PageHeader } from '../shared/ui/PageHeader'

export function MentorCatalog() {
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState<MentorFilter>('Все')
  const { scenario } = useAssignmentGateway()
  const { mentors } = useMentorGateway()
  const navigate = useNavigate()
  const filtered = filterMentors(searchMentors(mentors, search), specialization)

  if (scenario === 'active') {
    return <Stack gap="xl"><PageHeader eyebrow="Каталог" title="Наставники" /><Alert icon={<IconCheck size={20} />} title="У вас уже есть активный ментор" color="indigo">Одновременно можно работать только с одним наставником. Самостоятельная смена ментора не предусмотрена.</Alert><Button w="fit-content" onClick={() => navigate('/student/my-mentor')}>Открыть «Мой ментор»</Button></Stack>
  }

  return (
    <Stack gap="xl">
      <PageHeader eyebrow="Каталог" title="Наставники" description="Найдите специалиста, который поможет двигаться к вашей цели." />
      <div className="filter-bar">
        <SearchMentors value={search} onChange={setSearch} />
        <FilterMentors value={specialization} onChange={setSpecialization} />
      </div>
      <Text size="sm" c="dimmed">{filtered.length > 0 ? `Найдено: ${filtered.length}` : 'Нет совпадений'}</Text>
      {filtered.length > 0 ? <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="lg">{filtered.map((mentor) => <MentorCard key={mentor.id} mentor={mentor} />)}</SimpleGrid> : <EmptyContent icon={<IconSearch size={24} />} title="Наставники не найдены" description="Попробуйте другой запрос или сбросьте фильтр направления." action={{ label: 'Сбросить фильтры', onClick: () => { setSearch(''); setSpecialization('Все') } }} />}
    </Stack>
  )
}
