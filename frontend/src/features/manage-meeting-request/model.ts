import { useMeetingGateway } from '../../entities/meeting/model'

export function useManageMeetingRequest() {
  const { updateMeetingStatus } = useMeetingGateway()
  return { updateMeetingStatus }
}
