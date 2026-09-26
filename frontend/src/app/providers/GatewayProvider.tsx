import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { PlatformGateway, PlatformSnapshot } from '../../entities/gateway'
import { UserGatewayContext } from '../../entities/user/model'
import { MentorGatewayContext } from '../../entities/mentor/model'
import { StudentGatewayContext } from '../../entities/student/model'
import { AssignmentGatewayContext } from '../../entities/assignment/model'
import { AvailabilityGatewayContext } from '../../entities/availability/model'
import { MeetingGatewayContext } from '../../entities/meeting/model'
import { ReflectionGatewayContext } from '../../entities/reflection/model'
import { NotificationGatewayContext } from '../../entities/notification/model'
import { createGatewayContext } from '../../shared/lib/gateway'
import { createDemoGateway } from '../adapters/demo/gateway'

const LoaderContext = createContext<PlatformGateway['load'] | null>(null)
const feedback = createGatewayContext<Pick<PlatformSnapshot, 'notice' | 'noticeIsError' | 'dismissNotice'>>()
export const useFeedback = feedback.useGateway

export function useDataLoader() {
  const load = useContext(LoaderContext)
  if (!load) throw new Error('Gateway provider отсутствует')
  return load
}

function scope<K extends keyof PlatformSnapshot>(gateway: PlatformGateway, keys: K[]) {
  let previous: PlatformSnapshot | undefined
  let value: Pick<PlatformSnapshot, K>
  return {
    subscribe: gateway.subscribe,
    getSnapshot: () => {
      const snapshot = gateway.getSnapshot()
      if (snapshot !== previous) {
        previous = snapshot
        value = Object.fromEntries(keys.map(key => [key, snapshot[key]])) as Pick<PlatformSnapshot, K>
      }
      return value
    },
  }
}

export function GatewayProvider({ children, gateway: supplied }: { children: ReactNode; gateway?: PlatformGateway }) {
  const auth = useAuth()
  return <DomainGateways key={auth.user?.id ?? 'anonymous'} gateway={supplied}>{children}</DomainGateways>
}

function DomainGateways({ children, gateway: supplied }: { children: ReactNode; gateway?: PlatformGateway }) {
  const auth = useAuth()
  const [gateways] = useState(() => {
    const gateway = supplied ?? createDemoGateway(auth.user?.id ?? 'anonymous')
    return {
      load: gateway.load,
      user: scope(gateway, ['user', 'profile', 'roles', 'mode', 'setMode', 'saveProfile']),
      mentor: scope(gateway, ['mentors']),
      student: scope(gateway, ['students']),
      assignment: scope(gateway, ['scenario', 'assignment', 'currentMentor', 'setScenario', 'selectMentor']),
      availability: scope(gateway, ['availability', 'claimedSlotIds', 'addAvailability', 'removeAvailability']),
      meeting: scope(gateway, ['meetings', 'requestMeeting', 'cancelMeeting', 'updateMeetingStatus']),
      reflection: scope(gateway, ['reflections', 'saveReflection']),
      notification: scope(gateway, ['notifications', 'unreadCount', 'markAllNotificationsRead']),
      feedback: scope(gateway, ['notice', 'noticeIsError', 'dismissNotice']),
    }
  })
  const demo = useSyncExternalStore(gateways.user.subscribe, gateways.user.getSnapshot)
  const userSnapshot = useMemo(() => {
    const roles = auth.user?.roles ?? []
    const mode = roles.includes(demo.mode) ? demo.mode : roles[0] ?? 'student'
    return {
      ...demo, mode, roles, user: auth.user, loggedIn: auth.status === 'authenticated',
      profile: { ...demo.profile, ...(auth.user ? {
        firstName: auth.user.first_name, lastName: auth.user.last_name, email: auth.user.email,
        timezone: auth.user.timezone, avatarUrl: auth.user.avatar_url ?? '',
      } : {}) },
      setMode: (next: typeof mode) => { if (roles.includes(next)) demo.setMode(next) },
    }
  }, [auth.user, auth.status, demo])
  const userGateway = useMemo(() => ({ getSnapshot: () => userSnapshot, subscribe: gateways.user.subscribe }), [userSnapshot, gateways.user])
  return <LoaderContext.Provider value={gateways.load}>
    <UserGatewayContext.Provider value={userGateway}>
      <MentorGatewayContext.Provider value={gateways.mentor}>
        <StudentGatewayContext.Provider value={gateways.student}>
          <AssignmentGatewayContext.Provider value={gateways.assignment}>
            <AvailabilityGatewayContext.Provider value={gateways.availability}>
              <MeetingGatewayContext.Provider value={gateways.meeting}>
                <ReflectionGatewayContext.Provider value={gateways.reflection}>
                  <NotificationGatewayContext.Provider value={gateways.notification}>
                    <feedback.Context.Provider value={gateways.feedback}>{children}</feedback.Context.Provider>
                  </NotificationGatewayContext.Provider>
                </ReflectionGatewayContext.Provider>
              </MeetingGatewayContext.Provider>
            </AvailabilityGatewayContext.Provider>
          </AssignmentGatewayContext.Provider>
        </StudentGatewayContext.Provider>
      </MentorGatewayContext.Provider>
    </UserGatewayContext.Provider>
  </LoaderContext.Provider>
}
