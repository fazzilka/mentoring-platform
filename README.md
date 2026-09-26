# Mentoring Platform

Учебная web-платформа для взаимодействия учеников и наставников. Ученик выбирает одного ментора, записывается на встречи и сохраняет приватные заметки. Наставник видит учеников, подтверждает заявки и управляет доступностью. Один пользователь может иметь обе роли.

## Лабораторная работа №1

**«Интерфейс приложения и каркас frontend».**

Frontend работает только на mock/demo-данных, без запросов к backend domain API. Изменения выполняются в React Context и сохраняются в localStorage. Вход и регистрация имитируются, пароли не сохраняются — это не настоящая авторизация.

В репозитории присутствует backend предыдущего этапа. Он не изменяется в рамках Lab 1. Для демонстрации frontend не нужны backend, база данных и Docker.

### Запуск

Нужны Node.js 22+ и npm:

```bash
cd frontend
npm ci
npm run dev
```

Откройте <http://localhost:5173> и нажмите «Войти в демо». Можно также ввести любой корректный email и пароль от 8 символов или пройти demo-регистрацию. Обе роли доступны сразу; начальная роль при регистрации определяет первый экран.

Если порт занят: `npm run dev -- --port 5176`.

### Экраны

| Раздел | Экраны и маршруты |
|---|---|
| Auth | Login `/login`, Register `/register` |
| Student | Dashboard `/student/dashboard`, Mentor Catalog `/student/mentors`, Mentor Details `/student/mentors/:mentorId`, My Mentor `/student/my-mentor`, Meetings `/student/meetings`, Notes `/student/notes` |
| Mentor | Dashboard `/mentor/dashboard`, My Students `/mentor/students`, Student Details `/mentor/students/:studentId`, Meetings `/mentor/meetings`, Availability `/mentor/availability`, Notes `/mentor/notes` |
| Common | Profile `/profile`, Notifications `/notifications`, Settings `/settings`, Not Found для неизвестного маршрута |

### Сценарии ученика

Внизу `/student/dashboard` есть переключатель:

1. **Без ментора:** кнопка «Найти наставника», доступен каталог.
2. **Есть ментор:** карточка наставника и «Мой ментор» в навигации; другого выбрать нельзя.
3. **Ментор ушёл:** назначение завершено с `mentor_departed`, показано предупреждение и можно выбрать нового наставника.

Переключатель служит только для демонстрации преподавателю, не является реальной бизнес-функцией и не удаляет историю встреч и заметок.

### Взаимодействия

- Поиск наставника по имени, компании и навыкам, фильтры Backend / Frontend / ML / DevOps.
- Профиль наставника, свободные слоты, выбор через confirmation modal и сохранение назначения.
- Запрос встречи с текущим ментором и отмена без удаления истории. Длительность — 60/75/90 минут; не более двух встреч с одним наставником в неделю.
- Подтверждение и отклонение mock-заявок наставником. При подтверждении фиксируется текущая ссылка Телемоста: изменение профиля не меняет ссылку старой встречи.
- Создание свободного времени с проверкой будущей даты и пересечений, удаление только свободных слотов.
- Сохранение и редактирование reflections после завершённых встреч. Ученик видит свои заметки; наставник — свои и заметки учеников по общим встречам. Публичных оценок нет.
- Переключение ролей, редактирование профиля, отметка всех внутренних уведомлений прочитанными, имитация входа/выхода и persistence после reload.

Email, Telegram, фоновые задачи и реальные напоминания frontend не использует. Пространство ученика и пространство наставника имеют собственные встречи: переключение роли не означает вход под аккаунтом выбранного наставника.

### Mock-state и структура

Стек: React 19, TypeScript strict, Vite, Mantine, React Router, Tabler Icons, Motion.

Существующая структура сохранена без лишнего рефакторинга:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                # маршруты
│   │   └── layouts/AppLayout.tsx  # sidebar, toolbar, drawer
│   ├── features/platform/
│   │   ├── demoData.ts            # начальные mock-данные
│   │   └── usePlatformState.tsx   # Context, действия и persistence
│   ├── pages/                    # экраны
│   ├── shared/
│   │   ├── components/           # общий UI
│   │   ├── styles/global.css     # tokens, interaction и responsive
│   │   └── types/                # TypeScript-типы
│   └── main.tsx                  # React и Mantine providers
├── package.json
└── package-lock.json
```

`demoData.ts` создаёт четырёх наставников, трёх учеников, встречи разных статусов, историю назначений, свободные и занятые слоты, уведомления, reflections и профили обеих ролей. Экраны используют единый Context.

Данные хранятся в текущем браузере под ключом `mentoring-lab-01-v1`. Для сброса удалите этот ключ через DevTools → Application → Local Storage и перезагрузите страницу. Если localStorage недоступен, приложение работает без сохранения после reload.

### Дизайн и responsive

Светлая тема, system font, off-white фон, спокойный accent, тонкие borders и минимальные shadows. Translucency ограничена навигацией и floating surfaces. Press feedback мгновенный, Motion springs без bounce. Учитываются reduced motion, reduced transparency и повышенный контраст.

Desktop — sidebar, tablet — компактный sidebar, mobile — header и drawer. Проверяемые ширины: 1440, 1024, 768 и 390 px.

### Проверки

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Для ручной проверки переключите три сценария, выберите ментора, запросите и отмените встречу. В режиме наставника обработайте одну из его заявок, добавьте/удалите свободный слот. Сохраните и отредактируйте заметку, измените профиль, прочитайте уведомления и перезагрузите страницу.

### Скриншоты

Настоящие браузерные снимки находятся в `docs/screenshots/lab-01/`:

| Файл | Состояние |
|---|---|
| `01-student-dashboard-no-mentor.png` | Ученик без наставника |
| `02-mentor-catalog.png` | Каталог |
| `03-mentor-details.png` | Профиль наставника |
| `04-student-dashboard-with-mentor.png` | Ученик с наставником |
| `05-student-meetings.png` | Заявка на встречу |
| `06-mentor-dashboard.png` | Обзор наставника |
| `07-mentor-students.png` | Ученики |
| `08-mentor-availability.png` | Свободное время |
| `09-notifications.png` | Внутренние уведомления |
| `10-mobile-dashboard.png` | Mobile dashboard, 390 px |

## Остальная структура проекта

`backend/` содержит существующий FastAPI backend, модели, Alembic и тесты. `deploy/` и `docker-compose.yml` — конфигурацию локальной инфраструктуры. `.github/workflows/ci.yml` — проверки backend и frontend. Они не нужны для запуска Lab 1.

Основная ветка — `main`, изменения поступают через PR. Сообщения коммитов — Conventional Commits; рабочие ветки — `feature/MENT-XXX-description`, `fix/MENT-XXX-description`, `security/MENT-XXX-description`.
