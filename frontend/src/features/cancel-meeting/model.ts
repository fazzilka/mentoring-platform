import { useMeetingGateway } from '../../entities/meeting/model'

export function useCancelMeeting() {
  const { cancelMeeting } = useMeetingGateway()
  return { cancelMeeting }
}
