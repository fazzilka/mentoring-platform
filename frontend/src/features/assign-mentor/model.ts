import { useAssignmentGateway } from '../../entities/assignment/model'

export function useAssignMentor() {
  const { selectMentor } = useAssignmentGateway()
  return { selectMentor }
}
