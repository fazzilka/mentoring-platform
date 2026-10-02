import { SegmentedControl } from '@mantine/core'
import { specializations, type Specialization } from '../../entities/mentor/types'
import type { Mentor } from '../../entities'

export type MentorFilter = Specialization | 'Все'
export function filterMentors(mentors: Mentor[], specialization: MentorFilter) {
  return mentors.filter(mentor => specialization === 'Все' || mentor.specialization === specialization)
}
export function FilterMentors({ value, onChange }: { value: MentorFilter; onChange: (value: MentorFilter) => void }) {
  return <SegmentedControl value={value} data={['Все', ...specializations]} onChange={next => {
    if (next === 'Все' || specializations.some(item => item === next)) onChange(next as MentorFilter)
  }} aria-label="Специализация наставника" />
}
