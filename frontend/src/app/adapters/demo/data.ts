import type { AvailabilitySlot, Meeting, Mentor, Student, TimeSlot } from '../../../entities'

import type { PlatformData as DemoState } from '../../../entities/gateway'
import type { MeetingDuration } from '../../../entities/availability/types'

export const demoUserId = 'demo-user'

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value))
}

export function makeSlot(id: string, startsAt: string, duration: MeetingDuration): TimeSlot {
  return {
    id, startsAt, duration, dateLabel: dateLabel(startsAt), date: dateLabel(startsAt),
    time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(startsAt)),
  }
}

export function createDemoState(): DemoState {
  const date = (days: number, hour: number) => {
    const value = new Date()
    value.setDate(value.getDate() + days)
    value.setHours(hour, 0, 0, 0)
    return value.toISOString()
  }
  const mentors: Mentor[] = [
    {
      id: 'dmitry-backend', name: 'Дмитрий Волков', initials: 'ДВ', avatarColor: '#e1e5f4',
      about: 'Помогаю разработчикам перейти от учебных задач к надёжным сервисам. Вместе разберём архитектуру API, работу с базами данных и подготовку к техническим собеседованиям.',
      specialization: 'Backend', skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
      experience: '9 лет в разработке, 4 года наставничества', company: 'Яндекс', position: 'Senior Backend Engineer',
      timezone: 'Europe/Moscow', acceptingStudents: true, status: 'online',
      availableSlots: [makeSlot('dmitry-1', date(2, 18), 60), makeSlot('dmitry-2', date(4, 19), 75), makeSlot('dmitry-3', date(9, 18), 90)],
    },
    {
      id: 'anna-frontend', name: 'Анна Лебедева', initials: 'АЛ', avatarColor: '#e5e2ef',
      about: 'Учу создавать понятные и доступные интерфейсы. Помогаю освоить React и TypeScript, наладить тестирование и уверенно проводить ревью.',
      specialization: 'Frontend', skills: ['React', 'TypeScript', 'CSS', 'Accessibility'],
      experience: '7 лет в продуктовой разработке', company: 'Т-Банк', position: 'Frontend Team Lead',
      timezone: 'Europe/Moscow', acceptingStudents: true, status: 'online',
      availableSlots: [makeSlot('anna-1', date(3, 17), 60), makeSlot('anna-2', date(6, 18), 90)],
    },
    {
      id: 'maxim-ml', name: 'Максим Орлов', initials: 'МО', avatarColor: '#e0ebe3',
      about: 'Показываю, как перейти от ноутбука с экспериментами к работающей ML-системе. Разбираем качество данных, оценку моделей и воспроизводимость результатов.',
      specialization: 'ML', skills: ['Python', 'PyTorch', 'Pandas', 'MLOps'],
      experience: '8 лет в машинном обучении', company: 'Авито', position: 'Senior ML Engineer',
      timezone: 'Asia/Novosibirsk', acceptingStudents: true, status: 'online',
      availableSlots: [makeSlot('maxim-1', date(5, 15), 75)],
    },
    {
      id: 'elena-devops', name: 'Елена Соколова', initials: 'ЕС', avatarColor: '#ece5d9',
      about: 'Помогаю понять инфраструктуру через практику: от Linux и контейнеров до CI/CD и наблюдаемости. Учимся находить причины сбоев и проектировать устойчивые системы.',
      specialization: 'DevOps', skills: ['Linux', 'Docker', 'CI/CD', 'Prometheus'],
      experience: '10 лет в эксплуатации и автоматизации', company: 'Selectel', position: 'Platform Engineer',
      timezone: 'Europe/Moscow', acceptingStudents: false, status: 'away', availableSlots: [],
    },
  ]
  const students: Student[] = [
    { id: 'alexey', name: 'Алексей Морозов', initials: 'АМ', level: 'Middle', direction: 'Backend', skills: ['Python', 'PostgreSQL'], goal: 'Научиться проектировать сервисы и уверенно проводить код-ревью', about: 'Разрабатываю внутренние сервисы, хочу лучше понимать архитектурные решения.' },
    { id: 'maria', name: 'Мария Соколова', initials: 'МС', level: 'Junior', direction: 'Backend', skills: ['Python', 'FastAPI'], goal: 'Подготовиться к первой работе backend-разработчиком', about: 'Закончила курс Python и собираю портфолио из собственных проектов.' },
    { id: 'danil', name: 'Даниил Ким', initials: 'ДК', level: 'Middle', direction: 'Python', skills: ['Django', 'SQL'], goal: 'Улучшить навыки работы с производительностью приложений', about: 'Работаю в небольшой команде и хочу системно изучить оптимизацию сервисов.' },
  ]
  const availability: AvailabilitySlot[] = [
    { ...makeSlot('own-pending', date(2, 18), 60), state: 'pending' },
    { ...makeSlot('own-booked', date(3, 19), 75), state: 'booked' },
    { ...makeSlot('own-free-1', date(5, 18), 60), state: 'free' },
    { ...makeSlot('own-free-2', date(8, 19), 90), state: 'free' },
  ]
  const meeting = (id: string, studentId: string, title: string, slot: TimeSlot, status: Meeting['status']): Meeting => ({
    id, startsAt: slot.startsAt, title, mentorId: demoUserId, studentId,
    mentorName: 'Олег Митин', studentName: students.find((student) => student.id === studentId)?.name ?? 'Ученик',
    date: slot.date, time: slot.time, duration: slot.duration, status, slotId: slot.id,
    meetingUrl: status === 'confirmed' ? 'https://telemost.yandex.ru/' : undefined,
  })
  const meetings: Meeting[] = [
    meeting('mentor-pending', 'maria', 'Первое знакомство', availability[0], 'pending'),
    meeting('mentor-confirmed', 'alexey', 'Архитектура сервисов', availability[1], 'confirmed'),
    meeting('mentor-completed', 'danil', 'Оптимизация SQL-запросов', makeSlot('own-past', date(-4, 18), 90), 'completed'),
    {
      id: 'student-completed', startsAt: date(-7, 18), title: 'План развития в backend',
      mentorId: 'dmitry-backend', studentId: demoUserId, mentorName: 'Дмитрий Волков', studentName: 'Олег Митин',
      date: dateLabel(date(-7, 18)), time: '18:00', duration: 60, status: 'completed',
    },
    {
      id: 'student-cancelled', startsAt: date(-2, 18), title: 'Практика проектирования API',
      mentorId: 'dmitry-backend', studentId: demoUserId, mentorName: 'Дмитрий Волков', studentName: 'Олег Митин',
      date: dateLabel(date(-2, 18)), time: '18:00', duration: 75, status: 'cancelled',
    },
  ]
  return {
    mode: 'student',
    profile: {
      avatarUrl: '', firstName: 'Олег', lastName: 'Митин', email: 'oleg@example.ru', timezone: 'Europe/Moscow',
      studentAbout: 'Изучаю backend-разработку и делаю учебную платформу для наставничества.',
      studentLevel: 'Junior', studentDirection: 'Backend', studentGoal: 'Стать уверенным Python-разработчиком',
      studentTechnologies: 'Python, FastAPI, PostgreSQL', studentLearning: 'Архитектура API и тестирование',
      mentorAbout: 'Помогаю начинающим разработчикам разобраться в Python и сервисах.',
      mentorSpecialization: 'Backend', mentorSkills: 'Python, SQL, Docker', mentorExperience: '5 лет',
      mentorCompany: 'Продуктовая команда', mentorPosition: 'Backend Engineer', telemostUrl: 'https://telemost.yandex.ru/',
    },
    mentors, students, meetings, availability,
    assignments: [{ id: 'historical-assignment', mentorId: 'dmitry-backend', status: 'ended', startDate: dateLabel(date(-30, 18)), endDate: dateLabel(date(-1, 18)) }],
    notifications: [
      { id: 'notification-1', title: 'Новая заявка на встречу', description: 'Мария Соколова хочет обсудить план подготовки к первой работе.', time: 'Сегодня', kind: 'request', read: false },
      { id: 'notification-2', title: 'Встреча подтверждена', description: 'Встреча «Архитектура сервисов» добавлена в расписание.', time: 'Сегодня', kind: 'meeting', read: false },
      { id: 'notification-3', title: 'Новая заметка ученика', description: 'Даниил Ким поделился результатами практики после встречи.', time: 'Вчера', kind: 'note', read: true },
    ],
    reflections: [
      { id: 'reflection-student', meetingId: 'student-completed', author: 'student', date: dateLabel(date(-7, 18)), summary: 'Разобрали структуру backend-проекта и договорились начать с простого API.', nextStep: 'Добавить тесты для основных сценариев.' },
      { id: 'reflection-danil', meetingId: 'mentor-completed', author: 'student', date: dateLabel(date(-4, 18)), summary: 'Научился читать EXPLAIN ANALYZE и нашёл лишние запросы.', nextStep: 'Проверить индексы на таблице событий.' },
    ],
  }
}
