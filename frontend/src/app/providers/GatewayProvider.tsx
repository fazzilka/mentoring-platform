import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
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
import { createApiGateway } from '../adapters/api/gateway'
import { useQueryClient } from '@tanstack/react-query'

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
  const queryClient = useQueryClient()
  useEffect(() => { if (!auth.user) queryClient.clear() }, [auth.user, queryClient])
  if (!auth.user && !supplied) return children
  return <DomainGateways key={auth.user?.id ?? 'anonymous'} gateway={supplied}>{children}</DomainGateways>
}

function DomainGateways({ children, gateway: supplied }: { children: ReactNode; gateway?: PlatformGateway }) {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [gateways] = useState(() => {
    if (!supplied && !auth.user) throw new Error('Требуется авторизованный пользователь')
    const gateway = supplied ?? createApiGateway(queryClient, auth, auth.user!)
    return {
      load: gateway.load,
      user: scope(gateway, ['user', 'profile', 'roles', 'mode', 'setMode', 'saveProfile']),
      mentor: scope(gateway, ['mentors']),
      student: scope(gateway, ['students']),
      assignment: scope(gateway, ['scenario', 'assignment', 'currentMentor', 'departMentor', 'selectMentor']),
      availability: scope(gateway, ['availability', 'claimedSlotIds', 'addAvailability', 'removeAvailability']),
      meeting: scope(gateway, ['meetings', 'requestMeeting', 'createMentorMeeting', 'cancelMeeting', 'updateMeetingStatus']),
      reflection: scope(gateway, ['reflections', 'saveReflection']),
      notification: scope(gateway, ['notifications', 'unreadCount', 'markAllNotificationsRead', 'markNotificationRead']),
      feedback: scope(gateway, ['notice', 'noticeIsError', 'dismissNotice']),
    }
  })
  const domain = useSyncExternalStore(gateways.user.subscribe, gateways.user.getSnapshot)
  const userSnapshot = useMemo(() => {
    const roles = auth.user?.roles ?? []
    const mode = roles.includes(domain.mode) ? domain.mode : roles[0] ?? 'student'
    return {
      ...domain, mode, roles, user: auth.user, loggedIn: auth.status === 'authenticated',
      profile: { ...domain.profile, ...(auth.user ? {
        firstName: auth.user.first_name, lastName: auth.user.last_name, email: auth.user.email,
        timezone: auth.user.timezone, avatarUrl: auth.user.avatar_url ?? '',
        telegramUsername: auth.user.telegram_username ?? '', phoneNumber: auth.user.phone_number ?? '',
      } : {}) },
      setMode: (next: typeof mode) => { if (roles.includes(next)) domain.setMode(next) },
    }
  }, [auth.user, auth.status, domain])
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
