import { useMeetingGateway } from '../../entities/meeting/model'

export function useRequestMeeting() {
  const { requestMeeting } = useMeetingGateway()
  return { requestMeeting }
}
