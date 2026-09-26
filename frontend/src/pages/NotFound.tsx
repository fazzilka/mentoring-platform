import { Button, Text, Title } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()
  return <div className="auth-page"><div className="auth-panel"><Text className="eyebrow" ta="center">Ошибка 404</Text><Title ta="center">Страница не найдена</Title><Text ta="center" c="dimmed">Возможно, ссылка устарела или адрес введён с ошибкой.</Text><Button onClick={() => navigate('/')}>Вернуться на главную</Button></div></div>
}
