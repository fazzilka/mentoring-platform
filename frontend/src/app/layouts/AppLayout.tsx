import { RoleSwitch } from '../../features/switch-role/RoleSwitch'
import { useUserGateway } from '../../entities/user/model'
import { useAssignmentGateway } from '../../entities/assignment/model'
import { useSwitchRole } from '../../features/switch-role/model'
import { useAuthForm } from '../../features/auth-form/model'
import { useNotificationGateway } from '../../entities/notification/model'
import { ActionIcon, Alert, Box, Burger, Divider, Drawer, Group, Indicator, Stack, Text, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBell, IconCalendarEvent, IconCalendarTime, IconChevronRight, IconLayoutDashboard,
  IconLogout, IconNotes, IconSettings, IconUser, IconUsers, IconUserSearch,
} from '@tabler/icons-react'
import type { TablerIcon } from '@tabler/icons-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppNotice } from '../ui/AppNotice'

interface NavItem {
  label: string
  path: string
  icon: TablerIcon
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { mode } = useUserGateway()
  const { scenario } = useAssignmentGateway()
  const studentItems: NavItem[] = [
    { label: 'Обзор', path: '/student/dashboard', icon: IconLayoutDashboard },
    scenario === 'active'
      ? { label: 'Мой ментор', path: '/student/my-mentor', icon: IconUser }
      : { label: 'Наставники', path: '/student/mentors', icon: IconUserSearch },
    { label: 'Встречи', path: '/student/meetings', icon: IconCalendarEvent },
    { label: 'Заметки', path: '/student/notes', icon: IconNotes },
    { label: 'Уведомления', path: '/notifications', icon: IconBell },
  ]
  const mentorItems: NavItem[] = [
    { label: 'Обзор', path: '/mentor/dashboard', icon: IconLayoutDashboard },
    { label: 'Мои ученики', path: '/mentor/students', icon: IconUsers },
    { label: 'Встречи', path: '/mentor/meetings', icon: IconCalendarEvent },
    { label: 'Свободное время', path: '/mentor/availability', icon: IconCalendarTime },
    { label: 'Заметки', path: '/mentor/notes', icon: IconNotes },
    { label: 'Уведомления', path: '/notifications', icon: IconBell },
  ]

  return (
    <Stack gap={6} className="nav-list">
      {(mode === 'student' ? studentItems : mentorItems).map((item) => (
        <NavLink key={item.path} to={item.path} onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <item.icon size={20} stroke={1.8} />
          <span>{item.label}</span>
          <IconChevronRight className="nav-chevron" size={16} />
        </NavLink>
      ))}
    </Stack>
  )
}

function Brand() {
  return (
    <Group gap="sm" className="brand">
      <div className="brand-mark">M</div>
      <div><Text fw={700} lh={1.15}>Mentoring</Text><Text size="xs" c="dimmed">пространство роста</Text></div>
    </Group>
  )
}

function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const links: NavItem[] = [
    { label: 'Профиль', path: '/profile', icon: IconUser },
    { label: 'Настройки', path: '/settings', icon: IconSettings },
  ]
  return (
    <Stack gap={4}>
      {links.map((item) => (
        <NavLink key={item.path} to={item.path} onClick={onNavigate} className={({ isActive }) => `nav-link subtle${isActive ? ' active' : ''}`}>
          <item.icon size={19} stroke={1.8} /><span>{item.label}</span>
        </NavLink>
      ))}
    </Stack>
  )
}

function SidebarContent({ onNavigate, showBrand = true, showRoleSwitch = true }: { onNavigate?: () => void; showBrand?: boolean; showRoleSwitch?: boolean }) {
  const { user } = useUserGateway()
  const { logout } = useAuthForm()
  const [logoutError, setLogoutError] = useState('')
  const signOut = async () => {
    try { await logout(); navigate('/login') } catch { setLogoutError('Не удалось завершить сессию. Попробуйте ещё раз.') }
  }
  const navigate = useNavigate()
  return (
    <Stack h="100%" gap="xl">
      {showBrand && <Brand />}
      {showRoleSwitch && <RoleSwitch onNavigate={onNavigate} />}
      <Box style={{ flex: 1 }}><Navigation onNavigate={onNavigate} /></Box>
      <div>
        <Divider mb="md" />
        <AccountLinks onNavigate={onNavigate} />
        <Group mt="lg" gap="sm" className="user-chip">
          <div className="user-avatar">{user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'П'}</div>
          <div className="user-copy"><Text size="sm" fw={600}>{user?.name}</Text><Text size="xs" c="dimmed">{user?.email}</Text></div>
          <Tooltip label="Выйти"><ActionIcon variant="subtle" color="gray" aria-label="Выйти" onClick={signOut}><IconLogout size={18} /></ActionIcon></Tooltip>
        </Group>
        {logoutError && <Alert color="red" mt="sm">{logoutError}</Alert>}
      </div>
    </Stack>
  )
}

export function AppLayout() {
  const [opened, { open, close }] = useDisclosure(false)
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { mode, loggedIn, user, roles } = useUserGateway()
  const { setMode } = useSwitchRole()
  const { unreadCount } = useNotificationGateway()
  const pageTitles: Record<string, string> = {
    '/student/dashboard': 'Обзор', '/student/mentors': 'Наставники', '/student/my-mentor': 'Мой ментор',
    '/student/meetings': 'Встречи', '/student/notes': 'Заметки', '/mentor/dashboard': 'Обзор',
    '/mentor/students': 'Мои ученики', '/mentor/meetings': 'Встречи', '/mentor/availability': 'Свободное время',
    '/mentor/notes': 'Заметки', '/notifications': 'Уведомления', '/profile': 'Профиль', '/settings': 'Настройки',
  }
  const pageTitle = location.pathname.startsWith('/student/mentors/')
    ? 'Профиль наставника'
    : location.pathname.startsWith('/mentor/students/')
      ? 'Профиль ученика'
      : pageTitles[location.pathname] ?? 'Mentoring'

  useEffect(() => {
    if (location.pathname.startsWith('/student/') && mode !== 'student') setMode('student')
    if (location.pathname.startsWith('/mentor/') && mode !== 'mentor') setMode('mentor')
  }, [location.pathname, mode, setMode])

  if (!loggedIn) return <Navigate to="/login" replace />
  if (!user) return <Navigate to="/login" replace />
  if (location.pathname.startsWith('/student/') && !roles.includes('student')) return <Navigate to="/mentor/dashboard" replace />
  if (location.pathname.startsWith('/mentor/') && !roles.includes('mentor')) return <Navigate to="/student/dashboard" replace />

  return (
    <div className="app-shell">
      <aside className="sidebar"><SidebarContent showRoleSwitch={false} /></aside>
      <header className="mobile-header">
        <Brand />
        <Group gap="xs">
          <Indicator label={unreadCount} size={16} disabled={unreadCount === 0}>
            <ActionIcon variant="subtle" color="gray" aria-label={`Уведомления: ${unreadCount} непрочитанных`} onClick={() => navigate('/notifications')}><IconBell size={20} /></ActionIcon>
          </Indicator>
          <div className="user-avatar compact">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          <Burger opened={opened} onClick={open} aria-label="Открыть меню" />
        </Group>
      </header>
      <Drawer opened={opened} onClose={close} title={<Brand />} padding="md" size="min(340px, 88vw)">
        <Box h="calc(100vh - 90px)"><SidebarContent onNavigate={close} showBrand={false} /></Box>
      </Drawer>
      <main className="main-content">
        <header className="desktop-toolbar">
          <div className="toolbar-context"><Text size="xs" c="dimmed">{mode === 'student' ? 'Пространство ученика' : 'Пространство наставника'}</Text><Text size="sm" fw={650}>{pageTitle}</Text></div>
          <Group gap="md">
            <RoleSwitch compact />
            <Tooltip label="Уведомления">
              <Indicator label={unreadCount} size={16} disabled={unreadCount === 0}>
                <ActionIcon variant="subtle" color="gray" aria-label={`Уведомления: ${unreadCount} непрочитанных`} onClick={() => navigate('/notifications')}><IconBell size={20} /></ActionIcon>
              </Indicator>
            </Tooltip>
            <div className="user-avatar compact">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          </Group>
        </header>
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0.12 } : { type: 'spring', bounce: 0, duration: 0.34 }}
          className="page-container"
        >
          <Outlet />
        </motion.div>
      </main>
      <AppNotice />
    </div>
  )
}
