import { Alert, Avatar, Badge, Button, Divider, Group, Select, SimpleGrid, Stack, Tabs, Text, TextInput, Textarea, Title } from '@mantine/core'
import { IconBell, IconBrandTelegram, IconCalendarEvent, IconCheck, IconDeviceFloppy, IconPalette, IconUser } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyContent } from '../shared/components/EmptyContent'
import { PageHeader } from '../shared/components/PageHeader'
import { Surface } from '../shared/components/Surface'
import { usePlatformState } from '../features/platform/usePlatformState'
import type { ProfileDraft } from '../shared/types'

export function Profile() {
  const { profile, saveProfile, roles, addRole } = usePlatformState()
  const [draft, setDraft] = useState<ProfileDraft>(profile)
  const setField = (field: keyof ProfileDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }))
  useEffect(() => setDraft(profile), [profile])

  return <Stack gap="xl">
    <PageHeader eyebrow="Аккаунт" title="Профиль" description="Общие данные и профили для ваших ролей." action={<Button leftSection={<IconDeviceFloppy size={17} />} onClick={() => saveProfile(draft)}>Сохранить изменения</Button>} />
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
      <Surface><Stack align="center" py="md"><Avatar src={draft.avatarUrl || undefined} size={88} radius="xl">{draft.firstName[0]}{draft.lastName[0]}</Avatar><Title order={3}>{draft.firstName} {draft.lastName}</Title><Text size="sm" c="dimmed">{roles.map((role) => role === 'student' ? 'Ученик' : 'Наставник').join(' и ')}</Text><TextInput w="100%" label="Ссылка на аватар" placeholder="https://..." value={draft.avatarUrl} onChange={(event) => setField('avatarUrl', event.currentTarget.value)} /></Stack></Surface>
      <div className="span-two"><Surface><Title order={3}>Основная информация</Title><SimpleGrid cols={{ base: 1, sm: 2 }} mt="lg"><TextInput label="Имя" value={draft.firstName} onChange={(event) => setField('firstName', event.currentTarget.value)} /><TextInput label="Фамилия" value={draft.lastName} onChange={(event) => setField('lastName', event.currentTarget.value)} /><TextInput type="email" label="Email" value={draft.email} onChange={(event) => setField('email', event.currentTarget.value)} /><Select label="Часовой пояс" value={draft.timezone} onChange={(value) => setField('timezone', value ?? draft.timezone)} data={[{ value: 'Europe/Moscow', label: 'Москва · UTC+3' }, { value: 'Asia/Yekaterinburg', label: 'Екатеринбург · UTC+5' }, { value: 'Asia/Novosibirsk', label: 'Новосибирск · UTC+7' }]} /></SimpleGrid></Surface></div>
    </SimpleGrid>
    {roles.length === 1 && <Alert color="indigo" title="Вторая роль"><Group justify="space-between" gap="sm"><Text size="sm">Один аккаунт может быть учеником и наставником.</Text><Button variant="light" onClick={() => addRole(roles[0] === 'student' ? 'mentor' : 'student')}>Добавить роль {roles[0] === 'student' ? 'наставника' : 'ученика'}</Button></Group></Alert>}
    <Tabs defaultValue={roles[0]} variant="outline">
      <Tabs.List>{roles.includes('student') && <Tabs.Tab value="student">Профиль ученика</Tabs.Tab>}{roles.includes('mentor') && <Tabs.Tab value="mentor">Профиль наставника</Tabs.Tab>}</Tabs.List>
      {roles.includes('student') && <Tabs.Panel value="student" pt="lg"><Surface><Stack gap="md"><Textarea label="О себе" minRows={3} value={draft.studentAbout} onChange={(event) => setField('studentAbout', event.currentTarget.value)} /><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Текущий уровень" value={draft.studentLevel || null} onChange={(value) => setField('studentLevel', value ?? '')} data={['Intern', 'Junior', 'Middle', 'Senior']} /><TextInput label="Направление" value={draft.studentDirection} onChange={(event) => setField('studentDirection', event.currentTarget.value)} /><TextInput label="Цель" value={draft.studentGoal} onChange={(event) => setField('studentGoal', event.currentTarget.value)} /><TextInput label="Технологии через запятую" value={draft.studentTechnologies} onChange={(event) => setField('studentTechnologies', event.currentTarget.value)} /></SimpleGrid><Textarea label="Что хочу изучить" value={draft.studentLearning} onChange={(event) => setField('studentLearning', event.currentTarget.value)} /></Stack></Surface></Tabs.Panel>}
      {roles.includes('mentor') && <Tabs.Panel value="mentor" pt="lg"><Surface><Stack gap="md"><Textarea label="О себе" minRows={3} value={draft.mentorAbout} onChange={(event) => setField('mentorAbout', event.currentTarget.value)} /><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Специализация" value={draft.mentorSpecialization} onChange={(value) => setField('mentorSpecialization', value ?? 'Backend')} data={['Backend', 'Frontend', 'ML', 'DevOps']} /><TextInput label="Навыки через запятую" value={draft.mentorSkills} onChange={(event) => setField('mentorSkills', event.currentTarget.value)} /><TextInput label="Опыт" value={draft.mentorExperience} onChange={(event) => setField('mentorExperience', event.currentTarget.value)} /><TextInput label="Компания" value={draft.mentorCompany} onChange={(event) => setField('mentorCompany', event.currentTarget.value)} /><TextInput label="Должность" value={draft.mentorPosition} onChange={(event) => setField('mentorPosition', event.currentTarget.value)} /><TextInput label="Ссылка на Телемост" value={draft.telemostUrl} onChange={(event) => setField('telemostUrl', event.currentTarget.value)} /></SimpleGrid></Stack></Surface></Tabs.Panel>}
    </Tabs>
  </Stack>
}

export function Notifications() {
  const { notifications, markAllNotificationsRead } = usePlatformState()
  return <Stack gap="xl">
    <PageHeader eyebrow="Центр событий" title="Уведомления" description="Подтверждения, напоминания и новые заявки." action={<Button variant="subtle" disabled={!notifications.some((item) => !item.read)} onClick={markAllNotificationsRead}>Отметить все как прочитанные</Button>} />
    {notifications.length > 0 ? <div className="notification-feed">{notifications.map((item) => { const Icon = item.kind === 'meeting' ? IconCalendarEvent : IconBell; return <div className={`notification-row${item.read ? '' : ' unread'}`} key={item.id}><Group align="flex-start" wrap="nowrap"><div className="activity-icon"><Icon size={19} /></div><div style={{ flex: 1 }}><Group gap="xs"><Text fw={item.read ? 550 : 650}>{item.title}</Text>{!item.read && <span className="unread-dot" aria-label="Непрочитано" />}</Group><Text size="sm" c="dimmed" mt={5}>{item.description}</Text><Text size="xs" c="dimmed" mt={8}>{item.time}</Text></div>{!item.read && <Badge variant="light" size="sm">Новое</Badge>}</Group></div> })}</div> : <EmptyContent title="Уведомлений пока нет" description="Здесь появятся изменения встреч и новые заявки." />}
  </Stack>
}

export function Settings() {
  const navigate = useNavigate()
  const { telegramConnected, connectTelegram } = usePlatformState()
  return <Stack gap="xl">
    <PageHeader eyebrow="Аккаунт" title="Настройки" description="Каналы связи и параметры интерфейса." />
    <Surface><Group gap="md"><div className="icon-tile"><IconUser size={20} /></div><div><Title order={3}>Аккаунт</Title><Text size="sm" c="dimmed">Email и часовой пояс редактируются в профиле</Text></div></Group><Divider my="lg" /><Button variant="light" onClick={() => navigate('/profile')}>Открыть профиль</Button></Surface>
    <Surface><Group gap="md"><div className="icon-tile"><IconBell size={20} /></div><div><Title order={3}>Напоминания</Title><Text size="sm" c="dimmed">Уведомления в приложении и email за 60 и 5 минут до подтверждённой встречи.</Text></div></Group></Surface>
    <Surface><Group gap="md"><div className="icon-tile"><IconBrandTelegram size={20} /></div><div style={{ flex: 1 }}><Title order={3}>Telegram</Title><Text size="sm" c="dimmed">{telegramConnected ? 'Подключён для напоминаний' : 'Не подключён'}</Text></div><Button variant="default" leftSection={<IconBrandTelegram size={17} />} onClick={connectTelegram}>{telegramConnected ? 'Подключить заново' : 'Подключить'}</Button></Group><Text size="xs" c="dimmed" mt="md">Telegram используется только для уведомлений, не для переписки с наставником.</Text></Surface>
    <Surface><Group gap="md"><div className="icon-tile"><IconPalette size={20} /></div><div style={{ flex: 1 }}><Title order={3}>Интерфейс</Title><Text size="sm" c="dimmed">Светлая тема</Text></div><Badge variant="light" leftSection={<IconCheck size={14} />}>Активна</Badge></Group><Text size="sm" c="dimmed" mt="lg">Системные настройки reduced motion, reduced transparency и повышенного контраста учитываются автоматически.</Text></Surface>
  </Stack>
}
