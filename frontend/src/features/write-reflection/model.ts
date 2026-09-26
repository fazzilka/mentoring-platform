import { useReflectionGateway } from '../../entities/reflection/model'

export function useWriteReflection() {
  const { saveReflection } = useReflectionGateway()
  return { saveReflection }
}
