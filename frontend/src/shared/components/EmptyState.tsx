import { Button, Stack, Text, Title } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { Surface } from './Surface'

export function EmptyState() {
  const navigate = useNavigate()
  return (
    <Surface className="empty-state">
      <Stack align="center" gap="md">
        <div className="empty-icon"><IconSparkles size={28} /></div>
        <Title order={2}>Найдите наставника, который поможет достичь вашей цели</Title>
        <Text c="dimmed" ta="center" maw={520}>
          Выберите специалиста по направлению, изучите его опыт и договоритесь о первой встрече.
        </Text>
        <Button size="md" onClick={() => navigate('/student/mentors')}>Найти наставника</Button>
      </Stack>
    </Surface>
  )
}
