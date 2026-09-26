import { loginSchema, registrationSchema } from './schema'
import { formErrors } from '../../shared/lib/validation'
import { useAuthForm } from '../../features/auth-form/model'
import { Alert, Anchor, Button, Group, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconArrowRight, IconMail } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AppMode } from '../../entities'

function AuthBrand() {
  return <Group gap="sm" justify="center"><div className="brand-mark">M</div><Text fw={750} size="lg">Mentoring</Text></Group>
}

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuthForm()
  const [email, setEmail] = useState('oleg@example.ru')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const errors = formErrors(loginSchema, { email, password })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    setBusy(true)
    setError('')
    try {
      await login({ email, password })
      navigate('/student/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page"><form className="auth-panel" onSubmit={submit} noValidate>
    <AuthBrand />
    <div><Title order={1} ta="center">Рады видеть снова</Title><Text c="dimmed" ta="center" mt={8}>Демо лабораторной №1 — без подключения к серверу</Text></div>
    <Stack gap="md">
      {error && <Alert color="red">{error}</Alert>}
      <TextInput type="email" required label="Email" placeholder="oleg@example.ru" leftSection={<IconMail size={18} />} error={(attempted || Boolean(email)) ? errors.email : undefined} value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
      <PasswordInput required label="Пароль" error={(attempted || Boolean(password)) ? errors.password : undefined} value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
      <Button type="submit" size="md" loading={busy} rightSection={<IconArrowRight size={18} />}>Войти</Button>
      <Button type="button" variant="default" onClick={async () => { await login({ email: 'oleg@example.ru', password: 'demo-password' }); navigate('/student/dashboard') }}>Войти в демо</Button>
    </Stack>
    <Text ta="center" size="sm" c="dimmed">Нет аккаунта? <Anchor component={Link} to="/register">Зарегистрироваться</Anchor></Text>
  </form></div>
}

export function Register() {
  const navigate = useNavigate()
  const { register } = useAuthForm()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AppMode>('student')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const errors = formErrors(registrationSchema, { name, email, password, initial_role: role })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    setBusy(true)
    setError('')
    try {
      await register({ name, email, password, initial_role: role })
      navigate(`/${role}/dashboard`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось зарегистрироваться')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page"><form className="auth-panel wide" onSubmit={submit} noValidate>
    <AuthBrand />
    <div><Title order={1} ta="center">Создайте аккаунт</Title><Text c="dimmed" ta="center" mt={8}>Демо-регистрация: данные остаются в браузере, обе роли доступны сразу</Text></div>
    <Stack gap="md">
      {error && <Alert color="red">{error}</Alert>}
      <TextInput required label="Имя" error={(attempted || Boolean(name)) ? errors.name : undefined} value={name} onChange={(event) => setName(event.currentTarget.value)} />
      <TextInput required type="email" label="Email" leftSection={<IconMail size={18} />} error={(attempted || Boolean(email)) ? errors.email : undefined} value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
      <PasswordInput required minLength={8} label="Пароль" description="Не менее 8 символов" error={(attempted || Boolean(password)) ? errors.password : undefined} value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
      <div><Text size="sm" fw={500} mb={7}>Начальная роль</Text><SegmentedControl fullWidth value={role} onChange={(value) => setRole(value as AppMode)} data={[{ label: 'Ученик', value: 'student' }, { label: 'Наставник', value: 'mentor' }]} /></div>
      <Button type="submit" size="md" loading={busy}>Создать аккаунт</Button>
    </Stack>
    <Text ta="center" size="sm" c="dimmed">Уже зарегистрированы? <Anchor component={Link} to="/login">Войти</Anchor></Text>
  </form></div>
}
