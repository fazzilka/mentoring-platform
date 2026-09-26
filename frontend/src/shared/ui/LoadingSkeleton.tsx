import { Skeleton, Stack } from '@mantine/core'

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack gap="sm" aria-label="Загрузка данных">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={index === 0 ? 76 : 108} radius="md" />
      ))}
    </Stack>
  )
}
