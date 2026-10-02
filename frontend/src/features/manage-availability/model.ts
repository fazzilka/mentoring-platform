import { useAvailabilityGateway } from '../../entities/availability/model'

export function useManageAvailability() {
  const { addAvailability, removeAvailability } = useAvailabilityGateway()
  return { addAvailability, removeAvailability }
}
