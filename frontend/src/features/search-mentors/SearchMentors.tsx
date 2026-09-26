import { TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import type { Mentor } from '../../entities'

export function searchMentors(mentors: Mentor[], search: string) {
  const query = search.trim().toLowerCase()
  return mentors.filter(mentor => `${mentor.name} ${mentor.position} ${mentor.company} ${mentor.skills.join(' ')} ${mentor.specialization}`.toLowerCase().includes(query))
}

export function SearchMentors({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <TextInput leftSection={<IconSearch size={18} />} placeholder="Имя, компания или технология" value={value} onChange={event => onChange(event.currentTarget.value)} className="search-input" aria-label="Поиск наставника" />
}
