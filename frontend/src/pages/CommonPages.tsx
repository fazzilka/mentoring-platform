import { profileSchema } from '../features/edit-profile/schema'
import { formErrors } from '../shared/lib/validation'
import { useUserGateway } from '../entities/user/model'
import { useEditProfile } from '../features/edit-profile/model'
import { useNotificationGateway } from '../entities/notification/model'
import { useMarkNotificationsRead } from '../features/mark-notifications-read/model'
import { Alert, Avatar, Badge, Button, Divider, Group, Select, SimpleGrid, Stack, Tabs, Text, TextInput, Textarea, Title } from '@mantine/core'
import { IconBell, IconCalendarEvent, IconCheck, IconDeviceFloppy, IconPalette, IconUser } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyContent } from '../shared/ui/EmptyContent'
import { PageHeader } from '../shared/ui/PageHeader'
import { Surface } from '../shared/ui/Surface'
import type { ProfileDraft } from '../entities'
import { useAssignmentGateway } from '../entities/assignment/model'
import { Dialog } from '../shared/ui/Dialog'

export function Profile() {
  const { profile, roles } = useUserGateway()
  const { saveProfile } = useEditProfile()
  const [draft, setDraft] = useState<ProfileDraft>(profile)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    setSaveError('')
    try { await saveProfile(draft) } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Не удалось сохранить профиль') }
    finally { setSaving(false) }
  }
  const errors = formErrors(profileSchema, draft)
  const setField = (field: keyof ProfileDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }))

  return <Stack gap="xl">
    <PageHeader eyebrow="Аккаунт" title="Профиль" description="Общие данные и профили для ваших ролей." action={<Button loading={saving} leftSection={<IconDeviceFloppy size={17} />} onClick={save}>Сохранить изменения</Button>} />
    {saveError && <Alert color="red">{saveError}</Alert>}
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
      <Surface><Stack align="center" py="md"><Avatar src={draft.avatarUrl || undefined} size={88} radius="xl">{draft.firstName[0]}{draft.lastName[0]}</Avatar><Title order={3}>{draft.firstName} {draft.lastName}</Title><Text size="sm" c="dimmed">{roles.map((role) => role === 'student' ? 'Ученик' : 'Наставник').join(' и ')}</Text><TextInput w="100%" label="Ссылка на аватар" placeholder="https://..." error={errors.avatarUrl} value={draft.avatarUrl} onChange={(event) => setField('avatarUrl', event.currentTarget.value)} /></Stack></Surface>
      <div className="span-two"><Surface><Title order={3}>Основная информация</Title><SimpleGrid cols={{ base: 1, sm: 2 }} mt="lg"><TextInput label="Имя" error={errors.firstName} value={draft.firstName} onChange={(event) => setField('firstName', event.currentTarget.value)} /><TextInput label="Фамилия" error={errors.lastName} value={draft.lastName} onChange={(event) => setField('lastName', event.currentTarget.value)} /><TextInput type="email" label="Email" error={errors.email} value={draft.email} onChange={(event) => setField('email', event.currentTarget.value)} /><Select label="Часовой пояс" error={errors.timezone} value={draft.timezone} onChange={(value) => setField('timezone', value ?? draft.timezone)} data={[{ value: 'Europe/Moscow', label: 'Москва · UTC+3' }, { value: 'Asia/Yekaterinburg', label: 'Екатеринбург · UTC+5' }, { value: 'Asia/Novosibirsk', label: 'Новосибирск · UTC+7' }]} /></SimpleGrid></Surface></div>
    </SimpleGrid>
    <Alert color="indigo" title="Ваши данные">Профили, встречи и заметки сохраняются на сервере. Приватные заметки доступны только участникам встречи согласно их роли.</Alert>
    <Tabs defaultValue={roles[0]} variant="outline">
      <Tabs.List>{roles.includes('student') && <Tabs.Tab value="student">Профиль ученика</Tabs.Tab>}{roles.includes('mentor') && <Tabs.Tab value="mentor">Профиль наставника</Tabs.Tab>}</Tabs.List>
      {roles.includes('student') && <Tabs.Panel value="student" pt="lg"><Surface><Stack gap="md"><Textarea label="О себе" minRows={3} error={errors.studentAbout} value={draft.studentAbout} onChange={(event) => setField('studentAbout', event.currentTarget.value)} /><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Текущий уровень" value={draft.studentLevel || null} onChange={(value) => setField('studentLevel', value ?? '')} data={['Intern', 'Junior', 'Middle', 'Senior']} /><TextInput label="Направление" error={errors.studentDirection} value={draft.studentDirection} onChange={(event) => setField('studentDirection', event.currentTarget.value)} /><TextInput label="Цель" error={errors.studentGoal} value={draft.studentGoal} onChange={(event) => setField('studentGoal', event.currentTarget.value)} /><TextInput label="Технологии через запятую" error={errors.studentTechnologies} value={draft.studentTechnologies} onChange={(event) => setField('studentTechnologies', event.currentTarget.value)} /></SimpleGrid><Textarea label="Что хочу изучить" error={errors.studentLearning} value={draft.studentLearning} onChange={(event) => setField('studentLearning', event.currentTarget.value)} /></Stack></Surface></Tabs.Panel>}
      {roles.includes('mentor') && <Tabs.Panel value="mentor" pt="lg"><Surface><Stack gap="md"><Textarea label="О себе" minRows={3} error={errors.mentorAbout} value={draft.mentorAbout} onChange={(event) => setField('mentorAbout', event.currentTarget.value)} /><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Специализация" error={errors.mentorSpecialization} value={draft.mentorSpecialization} onChange={(value) => setField('mentorSpecialization', value ?? 'Backend')} data={['Backend', 'Frontend', 'ML', 'DevOps']} /><TextInput label="Навыки через запятую" error={errors.mentorSkills} value={draft.mentorSkills} onChange={(event) => setField('mentorSkills', event.currentTarget.value)} /><TextInput label="Опыт" error={errors.mentorExperience} value={draft.mentorExperience} onChange={(event) => setField('mentorExperience', event.currentTarget.value)} /><TextInput label="Компания" error={errors.mentorCompany} value={draft.mentorCompany} onChange={(event) => setField('mentorCompany', event.currentTarget.value)} /><TextInput label="Должность" error={errors.mentorPosition} value={draft.mentorPosition} onChange={(event) => setField('mentorPosition', event.currentTarget.value)} /><TextInput label="Ссылка на Телемост" error={errors.telemostUrl} value={draft.telemostUrl} onChange={(event) => setField('telemostUrl', event.currentTarget.value)} /></SimpleGrid></Stack></Surface></Tabs.Panel>}
    </Tabs>
  </Stack>
}

export function Notifications() {
  const { notifications, markNotificationRead } = useNotificationGateway()
  const { markAllNotificationsRead } = useMarkNotificationsRead()
  return <Stack gap="xl">
    <PageHeader eyebrow="Центр событий" title="Уведомления" description="Подтверждения, изменения встреч и новые заявки." action={<Button variant="subtle" disabled={!notifications.some((item) => !item.read)} onClick={markAllNotificationsRead}>Отметить все как прочитанные</Button>} />
    {notifications.length > 0 ? <div className="notification-feed">{notifications.map((item) => { const Icon = item.kind === 'meeting' ? IconCalendarEvent : IconBell; return <div className={`notification-row${item.read ? '' : ' unread'}`} key={item.id}><Group align="flex-start" wrap="nowrap"><div className="activity-icon"><Icon size={19} /></div><div style={{ flex: 1 }}><Group gap="xs"><Text fw={item.read ? 550 : 650}>{item.title}</Text>{!item.read && <span className="unread-dot" aria-label="Непрочитано" />}</Group><Text size="sm" c="dimmed" mt={5}>{item.description}</Text><Text size="xs" c="dimmed" mt={8}>{item.time}</Text></div>{!item.read && <Button variant="subtle" size="xs" onClick={() => { void markNotificationRead(item.id) }}>Прочитано</Button>}</Group></div> })}</div> : <EmptyContent title="Уведомлений пока нет" description="Здесь появятся изменения встреч и новые заявки." />}
  </Stack>
}

export function Settings() {
  const navigate = useNavigate()
  const { roles } = useUserGateway()
  const { departMentor } = useAssignmentGateway()
  const [confirmDeparture, setConfirmDeparture] = useState(false)
  const [departing, setDeparting] = useState(false)
  return <Stack gap="xl">
    <PageHeader eyebrow="Аккаунт" title="Настройки" description="Аккаунт, уведомления и параметры интерфейса." />
    <Surface><Group gap="md"><div className="icon-tile"><IconUser size={20} /></div><div><Title order={3}>Аккаунт</Title><Text size="sm" c="dimmed">Email и часовой пояс редактируются в профиле</Text></div></Group><Divider my="lg" /><Button variant="light" onClick={() => navigate('/profile')}>Открыть профиль</Button></Surface>
    <Surface><Group gap="md"><div className="icon-tile"><IconBell size={20} /></div><div><Title order={3}>Уведомления на сайте</Title><Text size="sm" c="dimmed">Новые заявки, изменения встреч и завершение наставничества появляются только внутри приложения.</Text></div></Group><Divider my="lg" /><Button variant="light" onClick={() => navigate('/notifications')}>Открыть уведомления</Button></Surface>
    {roles.includes('mentor') && <Surface><Title order={3}>Завершить работу наставником</Title><Text c="dimmed" size="sm" my="md">Активные назначения завершатся. Ученики смогут выбрать другого наставника, история встреч и заметок сохранится. Самостоятельно отменить это действие нельзя.</Text><Button color="red" variant="light" onClick={() => setConfirmDeparture(true)}>Прекратить наставничество</Button></Surface>}
    <Dialog opened={confirmDeparture} onClose={() => setConfirmDeparture(false)} title="Прекратить наставничество?" centered><Stack><Text size="sm">Все ваши активные назначения будут завершены. Это не удалит историю.</Text><Button color="red" loading={departing} onClick={async () => { setDeparting(true); const saved = await departMentor(); setDeparting(false); if (saved) setConfirmDeparture(false) }}>Подтвердить завершение</Button></Stack></Dialog>
    <Surface><Group gap="md"><div className="icon-tile"><IconPalette size={20} /></div><div style={{ flex: 1 }}><Title order={3}>Интерфейс</Title><Text size="sm" c="dimmed">Светлая тема</Text></div><Badge variant="light" leftSection={<IconCheck size={14} />}>Активна</Badge></Group><Text size="sm" c="dimmed" mt="lg">Системные настройки reduced motion, reduced transparency и повышенного контраста учитываются автоматически.</Text></Surface>
  </Stack>
}
